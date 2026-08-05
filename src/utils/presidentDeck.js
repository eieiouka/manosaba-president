const suitIds = [
  "spades",
  "hearts",
  "diamonds",
  "clubs",
];

const ranks = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
];

const strengthOrder = {
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  1: 14,
  2: 15,
  joker: 16,
};

const suitOrder = {
  spades: 1,
  hearts: 2,
  diamonds: 3,
  clubs: 4,
  joker: 5,
};

export function createDeck() {
  const cards = [];

  suitIds.forEach((suit) => {
    ranks.forEach((rank) => {
      cards.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        isJoker: false,
      });
    });
  });

  cards.push({
    id: "joker",
    suit: "joker",
    rank: "joker",
    isJoker: true,
  });

  return cards;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function sortHand(hand) {
  return [...hand].sort(
    (cardA, cardB) => {
      const strengthDifference =
        strengthOrder[cardA.rank] -
        strengthOrder[cardB.rank];

      if (strengthDifference !== 0) {
        return strengthDifference;
      }

      return (
        suitOrder[cardA.suit] -
        suitOrder[cardB.suit]
      );
    },
  );
}

export function createGameHands() {
  const deck = shuffleDeck(createDeck());

  const hands = [
    [],
    [],
    [],
    [],
  ];

  /*
    53枚なので1人だけ14枚になる。
    毎ゲーム誰が14枚になるかランダム。
  */
  const dealStartIndex = Math.floor(
    Math.random() * 4,
  );

  deck.forEach((card, index) => {
    const playerIndex =
      (dealStartIndex + index) % 4;

    hands[playerIndex].push(card);
  });

  return hands.map(sortHand);
}