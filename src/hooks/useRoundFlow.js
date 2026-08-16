import {
  useMemo,
  useState,
} from "react";

import {
  isJoker,
} from "../utils/presidentRules";

const FINISH_EVENTS = [
  "finishDaifugo",
  "finishFugo",
  "finishHinmin",
];

function getActivePlayerIndexes(hands) {
  return hands
    .map((hand, index) => ({
      index,
      cardCount: hand.length,
    }))
    .filter(
      (player) =>
        player.cardCount > 0,
    )
    .map(
      (player) => player.index,
    );
}

function containsJoker(cards) {
  return cards.some(isJoker);
}

export default function useRoundFlow({
  hands,
  playerCount,
}) {
  const [
    normalFinishOrder,
    setNormalFinishOrder,
  ] = useState([]);

  const [
    forbiddenFinishPlayerIndex,
    setForbiddenFinishPlayerIndex,
  ] = useState(null);

  const activePlayerIndexes =
    useMemo(
      () =>
        getActivePlayerIndexes(hands),
      [hands],
    );

  const finishOrder =
    useMemo(() => {
      const order = [
        ...normalFinishOrder,
      ];

      const eliminatedCount =
        normalFinishOrder.length +
        (forbiddenFinishPlayerIndex !==
        null
          ? 1
          : 0);

      if (
        activePlayerIndexes.length ===
          1 &&
        eliminatedCount >=
          playerCount - 1
      ) {
        const lastPlayer =
          activePlayerIndexes[0];

        if (!order.includes(lastPlayer)) {
          order.push(lastPlayer);
        }
      }

      if (
        forbiddenFinishPlayerIndex ===
        null
      ) {
        return order;
      }

      const withoutPenalty =
        order.filter(
          (playerIndex) =>
            playerIndex !==
            forbiddenFinishPlayerIndex,
        );

      if (
        eliminatedCount >=
          playerCount - 1 &&
        activePlayerIndexes.length <= 1
      ) {
        withoutPenalty.push(
          forbiddenFinishPlayerIndex,
        );
      }

      return withoutPenalty;
    }, [
      normalFinishOrder,
      forbiddenFinishPlayerIndex,
      activePlayerIndexes,
      playerCount,
    ]);

  const isRoundFinished =
    finishOrder.length === playerCount;

  function registerFinish({
    playerIndex,
    cards,
    nextHands,
  }) {
    if (
      nextHands[playerIndex].length !== 0
    ) {
      return {
        forbiddenFinish: false,
        finishEvent: null,
      };
    }

    if (containsJoker(cards)) {
      setForbiddenFinishPlayerIndex(
        playerIndex,
      );

      return {
        forbiddenFinish: true,
        finishEvent:
          "finishDaipinmin",
      };
    }

    const finishEvent =
      FINISH_EVENTS[
        normalFinishOrder.length
      ] ?? null;

    setNormalFinishOrder(
      (current) =>
        current.includes(playerIndex)
          ? current
          : [
              ...current,
              playerIndex,
            ],
    );

    return {
      forbiddenFinish: false,
      finishEvent,
    };
  }

  function resetRoundFinish() {
    setNormalFinishOrder([]);
    setForbiddenFinishPlayerIndex(null);
  }

  return {
    finishOrder,
    normalFinishOrder,
    forbiddenFinishPlayerIndex,
    isRoundFinished,
    registerFinish,
    resetRoundFinish,
  };
}