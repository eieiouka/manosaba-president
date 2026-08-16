const PLAYER_COUNT = 4;

const SUIT_OFFSET = {
  spades: 0,
  hearts: 13,
  diamonds: 26,
  clubs: 39,
};

const ALL_CARD_NUMBERS = Array.from(
  { length: 53 },
  (_, number) => number,
);

export function cardToNumber(card) {
  if (
    card?.isJoker ||
    card?.suit === "joker"
  ) {
    return 0;
  }

  const offset =
    SUIT_OFFSET[card?.suit];

  if (
    offset === undefined ||
    !Number.isInteger(card?.rank)
  ) {
    return -1;
  }

  return offset + card.rank;
}

function createUnknownHand(count) {
  return Array.from(
    { length: count },
    () => -1,
  );
}

export function createCpuCardMemories(
  hands,
) {
  const memories = {};

  for (
    let cpuIndex = 1;
    cpuIndex < PLAYER_COUNT;
    cpuIndex += 1
  ) {
    const estimatedHands = {};

    for (
      let playerIndex = 0;
      playerIndex < PLAYER_COUNT;
      playerIndex += 1
    ) {
      if (playerIndex === cpuIndex) {
        continue;
      }

      estimatedHands[playerIndex] =
        createUnknownHand(
          hands[playerIndex]?.length ?? 0,
        );
    }

    memories[cpuIndex] = {
      playerIndex: cpuIndex,
      estimatedHands,
      sentCards: [],
      receivedCards: [],
    };
  }

  return memories;
}

function removePlayedNumber(
  estimatedHand,
  cardNumber,
) {
  const nextHand = [...estimatedHand];

  const knownIndex =
    nextHand.indexOf(cardNumber);

  if (knownIndex !== -1) {
    nextHand.splice(knownIndex, 1);
    return nextHand;
  }

  const unknownIndex =
    nextHand.indexOf(-1);

  if (unknownIndex !== -1) {
    nextHand.splice(unknownIndex, 1);
  }

  return nextHand;
}

export function recordPublicPlay({
  memories,
  playerIndex,
  cards,
}) {
  const cardNumbers =
    cards.map(cardToNumber);

  const nextMemories = {};

  Object.entries(memories).forEach(
    ([cpuKey, memory]) => {
      const cpuIndex = Number(cpuKey);

      if (cpuIndex === playerIndex) {
        nextMemories[cpuIndex] = memory;
        return;
      }

      let nextEstimatedHand = [
        ...(memory.estimatedHands[
          playerIndex
        ] ?? []),
      ];

      cardNumbers.forEach((number) => {
        nextEstimatedHand =
          removePlayedNumber(
            nextEstimatedHand,
            number,
          );
      });

      nextMemories[cpuIndex] = {
        ...memory,
        estimatedHands: {
          ...memory.estimatedHands,
          [playerIndex]:
            nextEstimatedHand,
        },
      };
    },
  );

  return nextMemories;
}

export function recordPlayerElimination({
  memories,
  playerIndex,
}) {
  const nextMemories = {};

  Object.entries(memories).forEach(
    ([cpuKey, memory]) => {
      const cpuIndex = Number(cpuKey);

      if (cpuIndex === playerIndex) {
        nextMemories[cpuIndex] = memory;
        return;
      }

      nextMemories[cpuIndex] = {
        ...memory,
        estimatedHands: {
          ...memory.estimatedHands,
          [playerIndex]: [],
        },
      };
    },
  );

  return nextMemories;
}

function getExchangePartnerIndex({
  playerIndex,
  playerRanks,
}) {
  const partnerRankByRank = {
    大富豪: "大貧民",
    富豪: "貧民",
    貧民: "富豪",
    大貧民: "大富豪",
  };

  const partnerRank =
    partnerRankByRank[
      playerRanks[playerIndex]
    ];

  return playerRanks.indexOf(
    partnerRank,
  );
}

function replaceUnknownCards({
  estimatedHand,
  removeCount,
  knownIncomingNumbers,
}) {
  let nextHand = [...estimatedHand];

  for (
    let count = 0;
    count < removeCount;
    count += 1
  ) {
    const unknownIndex =
      nextHand.indexOf(-1);

    if (unknownIndex !== -1) {
      nextHand.splice(unknownIndex, 1);
    } else {
      /*
        安全側に倒す。
        交換されたカードを特定できない場合、
        既知情報を確定扱いし続けない。
      */
      nextHand.shift();
    }
  }

  return [
    ...knownIncomingNumbers,
    ...nextHand,
  ];
}

export function recordCardExchange({
  memories,
  handsBeforeExchange,
  playerRanks,
  outgoingCardIdsByPlayer,
}) {
  const outgoingCards =
    handsBeforeExchange.map(
      (hand, playerIndex) => {
        const outgoingIds = new Set(
          outgoingCardIdsByPlayer[
            playerIndex
          ] ?? [],
        );

        return hand.filter((card) =>
          outgoingIds.has(card.id),
        );
      },
    );

  const nextMemories = {};

  Object.entries(memories).forEach(
    ([cpuKey, memory]) => {
      const cpuIndex = Number(cpuKey);
      const partnerIndex =
        getExchangePartnerIndex({
          playerIndex: cpuIndex,
          playerRanks,
        });

      if (partnerIndex === -1) {
        nextMemories[cpuIndex] = memory;
        return;
      }

      const sentNumbers =
        outgoingCards[cpuIndex].map(
          cardToNumber,
        );

      const receivedNumbers =
        outgoingCards[partnerIndex].map(
          cardToNumber,
        );

      const partnerEstimate =
        memory.estimatedHands[
          partnerIndex
        ] ?? [];

      nextMemories[cpuIndex] = {
        ...memory,
        estimatedHands: {
          ...memory.estimatedHands,
          [partnerIndex]:
            replaceUnknownCards({
              estimatedHand:
                partnerEstimate,
              removeCount:
                receivedNumbers.length,
              knownIncomingNumbers:
                sentNumbers,
            }),
        },
        sentCards: [
          ...memory.sentCards,
          ...sentNumbers.map(
            (cardNumber) => ({
              cardNumber,
              toPlayerIndex:
                partnerIndex,
            }),
          ),
        ],
        receivedCards: [
          ...memory.receivedCards,
          ...receivedNumbers.map(
            (cardNumber) => ({
              cardNumber,
              fromPlayerIndex:
                partnerIndex,
            }),
          ),
        ],
      };
    },
  );

  return nextMemories;
}

export function buildCpuCardKnowledge({
  memories,
  hands,
  publicPlayedCardNumbers,
}) {
  const knowledge = {};

  Object.entries(memories).forEach(
    ([cpuKey, memory]) => {
      const cpuIndex = Number(cpuKey);

      const ownCardNumbers = new Set(
        (hands[cpuIndex] ?? []).map(
          cardToNumber,
        ),
      );

      const playedNumbers = new Set(
        publicPlayedCardNumbers,
      );

      const remainingOpponentCardNumbers =
        ALL_CARD_NUMBERS.filter(
          (number) =>
            !ownCardNumbers.has(number) &&
            !playedNumbers.has(number),
        );

      const knownOpponentCardNumbers =
        Object.values(
          memory.estimatedHands,
        )
          .flat()
          .filter((number) => number !== -1);

      const knownNumbers = new Set(
        knownOpponentCardNumbers,
      );

      knowledge[cpuIndex] = {
        ...memory,
        ownCardNumbers: [
          ...ownCardNumbers,
        ],
        publicPlayedCardNumbers: [
          ...publicPlayedCardNumbers,
        ],
        remainingOpponentCardNumbers,
        unknownOpponentCardNumbers:
          remainingOpponentCardNumbers.filter(
            (number) =>
              !knownNumbers.has(number),
          ),
      };
    },
  );

  return knowledge;
}
