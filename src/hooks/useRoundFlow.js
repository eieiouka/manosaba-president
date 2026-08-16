import {
  useMemo,
  useState,
} from "react";

import {
  isJoker,
} from "../utils/presidentRules";

const RANKS_BY_PLACE = [
  "大富豪",
  "富豪",
  "貧民",
  "大貧民",
];

const FINISH_EVENT_BY_RANK = {
  大富豪: "finishDaifugo",
  富豪: "finishFugo",
  貧民: "finishHinmin",
  大貧民: "finishDaipinmin",
};

function containsJoker(cards) {
  return cards.some(isJoker);
}

function getUnassignedPlayerIndexes({
  playerCount,
  normalFinishOrder,
  penaltyOrder,
}) {
  const assignedPlayers = new Set([
    ...normalFinishOrder,
    ...penaltyOrder,
  ]);

  return Array.from(
    { length: playerCount },
    (_, playerIndex) => playerIndex,
  ).filter(
    (playerIndex) =>
      !assignedPlayers.has(playerIndex),
  );
}

export default function useRoundFlow({
  playerCount,
  playerRanks,
}) {
  const [
    normalFinishOrder,
    setNormalFinishOrder,
  ] = useState([]);

  /*
    禁止上がり・都落ちが発生した順。
    先に発生した人から、
    大貧民 → 貧民の順に確定する。
  */
  const [penaltyOrder, setPenaltyOrder] =
    useState([]);

  const [
    forbiddenFinishPlayerIndexes,
    setForbiddenFinishPlayerIndexes,
  ] = useState([]);

  const [
    capitalFallPlayerIndex,
    setCapitalFallPlayerIndex,
  ] = useState(null);

  const previousDaifugoPlayerIndex =
    playerRanks?.indexOf("大富豪") ?? -1;

  const resolvedState = useMemo(() => {
    const remainingPlayers =
      getUnassignedPlayerIndexes({
        playerCount,
        normalFinishOrder,
        penaltyOrder,
      });

    const assignedCount =
      normalFinishOrder.length +
      penaltyOrder.length;

    const automaticPlayers =
      assignedCount === playerCount - 1 &&
      remainingPlayers.length === 1
        ? remainingPlayers
        : [];

    const finishOrder = [
      ...normalFinishOrder,
      ...automaticPlayers,
      ...[...penaltyOrder].reverse(),
    ];

    const rankByPlayer = Array.from(
      { length: playerCount },
      () => null,
    );

    normalFinishOrder.forEach(
      (playerIndex, place) => {
        rankByPlayer[playerIndex] =
          RANKS_BY_PLACE[place] ?? null;
      },
    );

    penaltyOrder.forEach(
      (playerIndex, penaltyPlace) => {
        const place =
          playerCount - 1 - penaltyPlace;

        rankByPlayer[playerIndex] =
          RANKS_BY_PLACE[place] ?? null;
      },
    );

    automaticPlayers.forEach(
      (playerIndex) => {
        const place =
          finishOrder.indexOf(playerIndex);

        rankByPlayer[playerIndex] =
          RANKS_BY_PLACE[place] ?? null;
      },
    );

    return {
      finishOrder,
      rankByPlayer,
      isRoundFinished:
        finishOrder.length === playerCount,
    };
  }, [
    normalFinishOrder,
    penaltyOrder,
    playerCount,
  ]);

  function getPenaltyRank(
    nextPenaltyIndex,
  ) {
    const place =
      playerCount - 1 - nextPenaltyIndex;

    return RANKS_BY_PLACE[place] ?? null;
  }

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
        leadingEvents: [],
        capitalFallPlayerIndex: null,
      };
    }

    if (containsJoker(cards)) {
      const penaltyRank =
        getPenaltyRank(
          penaltyOrder.length,
        );

      setForbiddenFinishPlayerIndexes(
        (current) =>
          current.includes(playerIndex)
            ? current
            : [...current, playerIndex],
      );

      setPenaltyOrder(
        (current) =>
          current.includes(playerIndex)
            ? current
            : [...current, playerIndex],
      );

      const penaltyFinishEvent =
        FINISH_EVENT_BY_RANK[penaltyRank];

      return {
        forbiddenFinish: true,
        finishEvent:
          penaltyFinishEvent ?? null,
        leadingEvents: [
          "forbiddenFinish",
          penaltyFinishEvent,
        ].filter(Boolean),
        capitalFallPlayerIndex: null,
      };
    }

    const normalRank =
      RANKS_BY_PLACE[
        normalFinishOrder.length
      ] ?? null;

    const normalFinishEvent =
      FINISH_EVENT_BY_RANK[
        normalRank
      ] ?? null;

    const capitalFallTarget =
      normalFinishOrder.length === 0 &&
      previousDaifugoPlayerIndex !== -1 &&
      previousDaifugoPlayerIndex !==
        playerIndex &&
      !penaltyOrder.includes(
        previousDaifugoPlayerIndex,
      )
        ? previousDaifugoPlayerIndex
        : null;

    const leadingEvents = [];

    if (capitalFallTarget !== null) {
      setCapitalFallPlayerIndex(
        capitalFallTarget,
      );

      setPenaltyOrder(
        (current) => [
          ...current,
          capitalFallTarget,
        ],
      );

      leadingEvents.push("capitalFall");
    }

    if (normalFinishEvent) {
      leadingEvents.push(
        normalFinishEvent,
      );
    }

    setNormalFinishOrder(
      (current) =>
        current.includes(playerIndex)
          ? current
          : [...current, playerIndex],
    );

    return {
      forbiddenFinish: false,
      finishEvent: normalFinishEvent,
      leadingEvents,
      capitalFallPlayerIndex:
        capitalFallTarget,
    };
  }

  function resetRoundFinish() {
    setNormalFinishOrder([]);
    setPenaltyOrder([]);
    setForbiddenFinishPlayerIndexes([]);
    setCapitalFallPlayerIndex(null);
  }

  return {
    finishOrder:
      resolvedState.finishOrder,
    rankByPlayer:
      resolvedState.rankByPlayer,
    normalFinishOrder,
    penaltyOrder,
    forbiddenFinishPlayerIndexes,
    forbiddenFinishPlayerIndex:
      forbiddenFinishPlayerIndexes[0] ??
      null,
    capitalFallPlayerIndex,
    isRoundFinished:
      resolvedState.isRoundFinished,
    registerFinish,
    resetRoundFinish,
  };
}
