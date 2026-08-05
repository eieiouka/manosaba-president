import {
  useState,
} from "react";

import {
  createGameHands,
} from "../utils/presidentDeck";

export default function usePresidentGame() {
  const [
    hands,
    setHands,
  ] = useState(
    createGameHands,
  );

  const [
    selectedCardIds,
    setSelectedCardIds,
  ] = useState([]);

  const [
    playedCards,
    setPlayedCards,
  ] = useState([]);

  const hand = hands[0];

  const toggleCardSelection = (
    card,
  ) => {
    setSelectedCardIds(
      (current) => {
        if (
          current.includes(card.id)
        ) {
          return current.filter(
            (cardId) =>
              cardId !== card.id,
          );
        }

        return [
          ...current,
          card.id,
        ];
      },
    );
  };

  const playSelectedCards = () => {
    if (
      selectedCardIds.length === 0
    ) {
      return;
    }

    const selectedSet =
      new Set(selectedCardIds);

    const cardsToPlay =
      hand.filter(
        (card) =>
          selectedSet.has(card.id),
      );

    setHands(
      (currentHands) =>
        currentHands.map(
          (
            currentHand,
            playerIndex,
          ) => {
            if (
              playerIndex !== 0
            ) {
              return currentHand;
            }

            return currentHand.filter(
              (card) =>
                !selectedSet.has(
                  card.id,
                ),
            );
          },
        ),
    );

    setPlayedCards(cardsToPlay);
    setSelectedCardIds([]);
  };

  const passTurn = () => {
    setSelectedCardIds([]);
  };

  return {
    hands,
    hand,
    selectedCardIds,
    playedCards,
    toggleCardSelection,
    playSelectedCards,
    passTurn,
  };
}