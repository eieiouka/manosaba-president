import {
  suits,
} from "../constants/presidentConstants";

export function getRankFileName(rank) {
  if (rank === 1) {
    return "A";
  }

  if (rank === 10) {
    return "T";
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return String(rank);
}

export function getRankLabel(rank) {
  if (rank === 1) {
    return "A";
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return String(rank);
}

export function getCardImagePath(
  suitId,
  rank,
) {
  if (suitId === "joker") {
    return "/cards/card_JOKER.png";
  }

  const suit = suits.find(
    (item) => item.id === suitId,
  );

  if (!suit) {
    return "";
  }

  return `/cards/card_${getRankFileName(
    rank,
  )}${suit.fileNumber}.png`;
}

export function getCardLabel(card) {
  if (card.isJoker) {
    return "ジョーカー";
  }

  const suit = suits.find(
    (item) => item.id === card.suit,
  );

  return `${suit?.symbol ?? ""}${getRankLabel(
    card.rank,
  )}`;
}