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
  const validSelections =
    getValidExchangeSelections(
      hand,
      rank,
    );

  if (validSelections.length === 0) {
    return [];
  }

  /*
    貧民・大貧民は最強札を渡すこと自体は強制。
    同じ強さの札を選べる場合だけ、交換後に
    同色の階段が最も多く残る組み合わせを選ぶ。
  */
  if (isForcedExchangeRank(rank)) {
    const bestSelection =
      [...validSelections].sort(
        (selectionA, selectionB) =>
          getStraightPreservationScore(
            removeCards(
              hand,
              selectionB,
            ),
          ) -
          getStraightPreservationScore(
            removeCards(
              hand,
              selectionA,
            ),
          ),
      )[0];

    return bestSelection.map(
      (card) => card.id,
    );
  }

  return chooseRichExchangeCards(
    hand,
    getExchangeCount(rank),
  ).map((card) => card.id);
}

function isJoker(card) {
  return Boolean(
    card?.isJoker ||
    card?.suit === "joker",
  );
}

/*
  同一スートで3枚以上連続しているカードを保護する。

  例：同色の4・5・6と、別色の5
  → 4・5・6だけを階段として保護
  → 別色の5は単品として交換できる
*/
function getStraightProtectedCardIds(hand) {
  const protectedIds = new Set();

  Object.keys(SUIT_ORDER)
    .filter((suit) => suit !== "joker")
    .forEach((suit) => {
      const suitedCards = hand
        .filter(
          (card) =>
            !isJoker(card) &&
            card.suit === suit,
        )
        .sort(
          (a, b) =>
            getCardStrength(a) -
            getCardStrength(b),
        );

      let run = [];

      const preserveRun = () => {
        if (run.length >= 3) {
          run.forEach((card) => {
            protectedIds.add(card.id);
          });
        }
      };

      suitedCards.forEach((card) => {
        const previous =
          run[run.length - 1];

        if (
          !previous ||
          getCardStrength(card) ===
            getCardStrength(previous) + 1
        ) {
          run.push(card);
          return;
        }

        preserveRun();
        run = [card];
      });

      preserveRun();
    });

  return protectedIds;
}

function getStraightPreservationScore(hand) {
  return getStraightProtectedCardIds(
    hand,
  ).size;
}

function removeCards(hand, removedCards) {
  const removedIds = new Set(
    removedCards.map((card) => card.id),
  );

  return hand.filter(
    (card) => !removedIds.has(card.id),
  );
}

function chooseRichExchangeCards(
  hand,
  count,
) {
  const straightProtectedIds =
    getStraightProtectedCardIds(hand);

  const unprotectedCards = hand.filter(
    (card) =>
      !straightProtectedIds.has(card.id),
  );

  const countByStrength = new Map();

  unprotectedCards.forEach((card) => {
    const strength =
      getCardStrength(card);

    countByStrength.set(
      strength,
      (countByStrength.get(strength) ?? 0) +
        1,
    );
  });

  const scoredCards = hand.map(
    (card, handIndex) => {
      const strength =
        getCardStrength(card);
      const isProtected =
        straightProtectedIds.has(card.id);
      const remainingSameRankCount =
        countByStrength.get(strength) ?? 0;

      let category = 8;

      if (!isProtected && !isJoker(card)) {
        if (
          remainingSameRankCount === 1 &&
          strength >= 4 &&
          strength <= 11
        ) {
          /* 4～Jの単品を最優先。 */
          category = 0;
        } else if (
          remainingSameRankCount === 1 &&
          strength === 3
        ) {
          /* 次に単独3。 */
          category = 1;
        } else if (
          remainingSameRankCount >= 2 &&
          strength >= 4
        ) {
          /* それもなければ、4以上の最小ペアを崩す。 */
          category = 2;
        } else if (
          remainingSameRankCount === 1
        ) {
          /* Q以上など、その他の単品。 */
          category = 3;
        } else {
          category = 4;
        }
      } else if (!isProtected && isJoker(card)) {
        /* Jokerは最後まで渡さない。 */
        category = 7;
      } else {
        /* 階段を構成する札は極力守る。 */
        category = 6;
      }

      return {
        card,
        category,
        strength,
        handIndex,
      };
    },
  );

  scoredCards.sort((a, b) =>
    a.category - b.category ||
    a.strength - b.strength ||
    a.handIndex - b.handIndex,
  );

  const selected = [];
  const selectedStrengths = new Set();

  /*
    大富豪が2枚渡す場合、候補があるなら
    同じペアの両方をまとめて渡さず、別の数字から1枚ずつ選ぶ。
  */
  scoredCards.forEach((entry) => {
    if (
      selected.length >= count ||
      selectedStrengths.has(entry.strength)
    ) {
      return;
    }

    selected.push(entry.card);
    selectedStrengths.add(entry.strength);
  });

  scoredCards.forEach((entry) => {
    if (
      selected.length >= count ||
      selected.some(
        (card) => card.id === entry.card.id,
      )
    ) {
      return;
    }

    selected.push(entry.card);
  });

  return selected;
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
