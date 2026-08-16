import {
  useEffect,
  useState,
} from "react";

import {
  getPlayEffects,
  getSingleNaturalStrength,
  getSingleNaturalSuit,
  isSingleJoker,
  isSpadeThree,
} from "../utils/presidentRules";

const RULE_EFFECT_TIME = 900;

export default function useFieldRules({
  hands,
  playedCards,
  setPlayedCards,
  setLastPlayPlayerIndex,
  setConsecutivePasses,
  setCurrentPlayerIndex,
  getNextPlayerIndex,
}) {
  const [revolution, setRevolution] =
    useState(false);

  const [elevenBack, setElevenBack] =
    useState(false);

  const [lockedSuit, setLockedSuit] =
    useState(null);

  const [gekiShibari, setGekiShibari] =
    useState(false);

  const [
    singleStrengthHistory,
    setSingleStrengthHistory,
  ] = useState([]);

  const [
    lastRuleEvents,
    setLastRuleEvents,
  ] = useState([]);

  const [
    ruleEffectQueue,
    setRuleEffectQueue,
  ] = useState([]);

  const [
    pendingSpecialClear,
    setPendingSpecialClear,
  ] = useState(null);

  const activeRuleEffect =
    ruleEffectQueue[0] ?? null;

  const isRuleEffectPlaying =
    ruleEffectQueue.length > 0;

  function resetTemporaryFieldRules() {
    setElevenBack(false);
    setLockedSuit(null);
    setGekiShibari(false);
    setSingleStrengthHistory([]);
  }

  function clearRuleEffects() {
    setLastRuleEvents([]);
    setRuleEffectQueue([]);
  }

  function resetFieldRules() {
    setRevolution(false);
    resetTemporaryFieldRules();
    clearRuleEffects();
    setPendingSpecialClear(null);
  }

  function triggerRuleEvents(events) {
    setLastRuleEvents(events);
    setRuleEffectQueue(events);
  }

  function moveToNextActive(
    nextHands,
    playerIndex,
  ) {
    const nextPlayer =
      getNextPlayerIndex(
        nextHands,
        playerIndex,
      );

    if (nextPlayer !== null) {
      setCurrentPlayerIndex(nextPlayer);
    }
  }

  function clearFieldAfterSpecial(
    cards,
    playerIndex,
  ) {
    setPlayedCards(cards);
    setLastPlayPlayerIndex(playerIndex);
    setConsecutivePasses(0);

    setPendingSpecialClear({
      playerIndex,
    });
  }

  useEffect(() => {
    if (!activeRuleEffect) {
      return undefined;
    }

    const timerId =
      window.setTimeout(() => {
        setRuleEffectQueue(
          (current) =>
            current.slice(1),
        );
      }, RULE_EFFECT_TIME);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeRuleEffect]);

  useEffect(() => {
    if (
      isRuleEffectPlaying ||
      !pendingSpecialClear
    ) {
      return;
    }

    const { playerIndex } =
      pendingSpecialClear;

    setPlayedCards([]);
    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);
    resetTemporaryFieldRules();
    setPendingSpecialClear(null);

    if (hands[playerIndex].length > 0) {
      setCurrentPlayerIndex(playerIndex);
      return;
    }

    const nextPlayer =
      getNextPlayerIndex(
        hands,
        playerIndex,
      );

    if (nextPlayer !== null) {
      setCurrentPlayerIndex(nextPlayer);
    }
  }, [
    isRuleEffectPlaying,
    pendingSpecialClear,
    hands,
    getNextPlayerIndex,
    setPlayedCards,
    setLastPlayPlayerIndex,
    setConsecutivePasses,
    setCurrentPlayerIndex,
  ]);

  function applyPlayRules({
    cards,
    analysis,
    playerIndex,
    nextHands,
    forbiddenFinish,
    finishEvent,
    leadingEvents = [],
  }) {
    const effects =
      getPlayEffects(cards, analysis);

    const spadeThreeReturn =
      isSingleJoker(playedCards) &&
      isSpadeThree(cards);

    if (spadeThreeReturn) {
      triggerRuleEvents([
        ...leadingEvents,
        "spadeThree",
      ]);

      clearFieldAfterSpecial(
        cards,
        playerIndex,
      );
      return;
    }

    const events = [
      ...leadingEvents,
    ];

    /*
      古い呼び出し方との互換用。
      leadingEventsが渡された場合は
      そちらですでに順番が確定している。
    */
    if (
      leadingEvents.length === 0 &&
      forbiddenFinish
    ) {
      events.push("forbiddenFinish");
    }

    if (
      leadingEvents.length === 0 &&
      finishEvent
    ) {
      events.push(finishEvent);
    }

    if (effects.revolution) {
      setRevolution(
        (current) => !current,
      );
      events.push("revolution");
    }

    if (effects.eightCut) {
      events.push("eightCut");
      triggerRuleEvents(events);
      clearFieldAfterSpecial(
        cards,
        playerIndex,
      );
      return;
    }

    if (
      analysis.type === "single" &&
      !isSingleJoker(cards)
    ) {
      const candidateSuit =
        getSingleNaturalSuit(cards);

      const candidateStrength =
        getSingleNaturalStrength(cards);

      const previousSuit =
        getSingleNaturalSuit(
          playedCards,
        );

      const previousStrength =
        getSingleNaturalStrength(
          playedCards,
        );

      const sameSuit =
        candidateSuit &&
        previousSuit &&
        candidateSuit === previousSuit;

      const consecutive =
        previousStrength !== null &&
        candidateStrength !== null &&
        Math.abs(
          candidateStrength -
            previousStrength,
        ) === 1;

      if (
        sameSuit &&
        consecutive &&
        !gekiShibari
      ) {
        setLockedSuit(candidateSuit);
        setGekiShibari(true);
        events.push("gekiShibari");
      } else if (
        sameSuit &&
        !lockedSuit
      ) {
        setLockedSuit(candidateSuit);
        events.push("shibari");
      }

      setSingleStrengthHistory(
        (current) => [
          ...current,
          candidateStrength,
        ],
      );
    }

    if (
      effects.elevenBack &&
      !elevenBack
    ) {
      setElevenBack(true);
      events.push("elevenBack");
    }

    triggerRuleEvents(events);

    setPlayedCards(cards);
    setLastPlayPlayerIndex(playerIndex);
    setConsecutivePasses(0);

    moveToNextActive(
      nextHands,
      playerIndex,
    );
  }

  return {
    revolution,
    elevenBack,
    lockedSuit,
    gekiShibari,
    singleStrengthHistory,

    lastRuleEvents,
    activeRuleEffect,
    isRuleEffectPlaying,

    applyPlayRules,
    resetTemporaryFieldRules,
    clearRuleEffects,
    resetFieldRules,
  };
}
