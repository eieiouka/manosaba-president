export const GAME_WIDTH = 1500;
export const GAME_HEIGHT = 1220;
export const PAGE_PADDING = 16;

export const suits = [
  {
    id: "spades",
    symbol: "♠",
    fileNumber: 1,
  },
  {
    id: "hearts",
    symbol: "♥",
    fileNumber: 2,
  },
  {
    id: "diamonds",
    symbol: "♦",
    fileNumber: 3,
  },
  {
    id: "clubs",
    symbol: "♣",
    fileNumber: 4,
  },
];

export const opponents = [
  {
    id: "ema",
    name: "桜羽エマ",
    image: "/characters/ema.png",
    position: "playerLeft",
    rank: "平民",
  },
  {
    id: "sherry",
    name: "橘シェリー",
    image: "/characters/sherry.png",
    position: "playerTop",
    rank: "富豪",
  },
  {
    id: "hanna",
    name: "遠野ハンナ",
    image: "/characters/hanna.png",
    position: "playerRight",
    rank: "貧民",
  },
];