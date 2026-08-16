import {
  getCardStrength,
} from "./cardUtils";

const EXCHANGE_COUNT_BY_RANK = {
  大富豪: 2,
  富豪: 1,
  貧民: 1,
  大貧民: 2,
};

const FORCED_RANKS = new Set([
  "貧民",
  "大貧民",
]);

const EXCHANGE_PARTNER = {
  大富豪: "大貧民",
  富豪: "貧民",
  貧民: "富豪",
  大貧民: "大富豪",
};

const SUIT_ORDER = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
  joker: 4,
};

export function getExchangeCount(rank) {
  return EXCHANGE_COUNT_BY_RANK[rank] ?? 0;
}

export function isForcedExchangeRank(rank) {
  return FORCED_RANKS.has(rank);
}

function getCombinations(items, count) {
  const combinations = [];

  function visit(start, selected) {
    if (selected.length === count) {
      combinations.push(selected);
      return;
    }

    for (
      let index = start;
      index < items.length;
      index += 1
    ) {
      visit(index + 1, [
        ...selected,
        items[index],
      ]);
    }
  }

  visit(0, []);
  return combinations;
}

function getRequiredStrengths(hand, count) {
  return hand
    .map(getCardStrength)
    .sort((a, b) => b - a)
    .slice(0, count)
    .sort((a, b) => a - b);
}

function hasSameStrengths(
  cards,
  requiredStrengths,
) {
  const strengths = cards
    .map(getCardStrength)
    .sort((a, b) => a - b);

  return strengths.every(
    (strength, index) =>
      strength ===
      requiredStrengths[index],
  );
}

export function getValidExchangeSelections(
  hand,
  rank,
) {
  const count = getExchangeCount(rank);

  if (count === 0) {
    return [];
  }

  const combinations =
    getCombinations(hand, count);

  if (!isForcedExchangeRank(rank)) {
    return combinations;
  }

  const requiredStrengths =
    getRequiredStrengths(hand, count);

  return combinations.filter(
    (cards) =>
      hasSameStrengths(
        cards,
        requiredStrengths,
      ),
  );
}

export function getExchangePlayableCardIds({
  hand,
  rank,
  selectedCardIds,
}) {
  const validSelections =
    getValidExchangeSelections(
      hand,
      rank,
    );

  const playableIds = new Set();

  validSelections.forEach((selection) => {
    const selectionIds =
      selection.map((card) => card.id);

    const containsCurrentSelection =
      selectedCardIds.every(
        (cardId) =>
          selectionIds.includes(cardId),
      );

    if (!containsCurrentSelection) {
      return;
    }

    selectionIds.forEach((cardId) => {
      if (
        !selectedCardIds.includes(cardId)
      ) {
        playableIds.add(cardId);
      }
    });
  });

  return [...playableIds];
}

export function isValidExchangeSelection({
  hand,
  rank,
  selectedCardIds,
}) {
  return getValidExchangeSelections(
    hand,
    rank,
  ).some((selection) => {
    const selectionIds =
      selection.map((card) => card.id);

    return (
      selectionIds.length ===
        selectedCardIds.length &&
      selectionIds.every((cardId) =>
        selectedCardIds.includes(cardId),
      )
    );
  });
}

export function getCpuExchangeCardIds(
  hand,
  rank,
) {
  const firstSelection =
    getValidExchangeSelections(
      hand,
      rank,
    )[0] ?? [];

  return firstSelection.map(
    (card) => card.id,
  );
}

function sortHand(cards) {
  return [...cards].sort((a, b) => {
    const strengthDifference =
      getCardStrength(a) -
      getCardStrength(b);

    if (strengthDifference !== 0) {
      return strengthDifference;
    }

    return (
      (SUIT_ORDER[a.suit] ?? 99) -
      (SUIT_ORDER[b.suit] ?? 99)
    );
  });
}

export function createExchangedHands({
  hands,
  playerRanks,
  outgoingCardIdsByPlayer,
}) {
  const outgoingCards = hands.map(
    (hand, playerIndex) => {
      const selectedIds =
        outgoingCardIdsByPlayer[
          playerIndex
        ] ?? [];

      return hand.filter((card) =>
        selectedIds.includes(card.id),
      );
    },
  );

  return hands.map(
    (hand, playerIndex) => {
      const rank =
        playerRanks[playerIndex];

      const partnerRank =
        EXCHANGE_PARTNER[rank];

      const partnerIndex =
        playerRanks.indexOf(
          partnerRank,
        );

      const outgoingIds = new Set(
        outgoingCards[playerIndex].map(
          (card) => card.id,
        ),
      );

      const remainingCards =
        hand.filter(
          (card) =>
            !outgoingIds.has(card.id),
        );

      const receivedCards =
        partnerIndex === -1
          ? []
          : outgoingCards[partnerIndex];

      return sortHand([
        ...remainingCards,
        ...receivedCards,
      ]);
    },
  );
}
