import {
  useEffect,
  useRef,
} from "react";

import {
  canBeatPlay,
  getAllValidPlays,
} from "../utils/presidentRules";

import {
  playGameSound,
} from "../utils/gameAudio";

const CPU_THINK_TIME = 700;

const CARD_PLAY_SOUND_SOURCE =
  "/audio/card-play.mp3";

export default function useCpuTurn({
  currentPlayerIndex,
  hands,
  fieldPlay,
  ruleContext,

  playedCards,
  consecutivePasses,
  lastPlayPlayerIndex,

  isRoundFinished,
  isRuleEffectPlaying,

  animateCpuCards,

  getNextPlayerIndex,
  setCurrentPlayerIndex,
  commitPlay,
  handlePass,
}) {
  const actionInProgressRef =
    useRef(false);

  const animateCpuCardsRef =
    useRef(animateCpuCards);

  const getNextPlayerIndexRef =
    useRef(getNextPlayerIndex);

  const setCurrentPlayerIndexRef =
    useRef(setCurrentPlayerIndex);

  const commitPlayRef =
    useRef(commitPlay);

  const handlePassRef =
    useRef(handlePass);

  animateCpuCardsRef.current =
    animateCpuCards;

  getNextPlayerIndexRef.current =
    getNextPlayerIndex;

  setCurrentPlayerIndexRef.current =
    setCurrentPlayerIndex;

  commitPlayRef.current =
    commitPlay;

  handlePassRef.current =
    handlePass;

  useEffect(() => {
    if (
      actionInProgressRef.current ||
      currentPlayerIndex === 0 ||
      isRoundFinished ||
      isRuleEffectPlaying
    ) {
      return undefined;
    }

    if (
      hands[currentPlayerIndex]
        .length === 0
    ) {
      const nextPlayer =
        getNextPlayerIndexRef.current(
          hands,
          currentPlayerIndex,
        );

      if (nextPlayer !== null) {
        setCurrentPlayerIndexRef.current(
          nextPlayer,
        );
      }

      return undefined;
    }

    const timerId =
      window.setTimeout(() => {
        const cpuIndex =
          currentPlayerIndex;

        const cpuHand =
          hands[cpuIndex];

        const legalCpuPlays =
          getAllValidPlays(
            cpuHand,
          ).filter((play) =>
            canBeatPlay(
              play.analysis,
              fieldPlay,
              {
                ...ruleContext,

                candidateCards:
                  play.cards,
              },
            ),
          );

        /*
          暫定CPUは、
          左側から作れる
          最初の合法手を出す。
        */
        const chosenPlay =
          legalCpuPlays[0];

        if (!chosenPlay) {
          handlePassRef.current(
            cpuIndex,
          );

          return;
        }

        let committed = false;

        const commitCpuPlay = () => {
          if (committed) {
            return;
          }

          committed = true;

          actionInProgressRef.current =
            false;

          commitPlayRef.current({
            playerIndex: cpuIndex,
            play: chosenPlay,
          });
        };

        const animate =
          animateCpuCardsRef.current;

        if (animate) {
          actionInProgressRef.current =
            true;

          animate({
            playerIndex: cpuIndex,
            cards:
              chosenPlay.cards,
            onLanding:
              commitCpuPlay,
          });

          return;
        }

        playGameSound(
          CARD_PLAY_SOUND_SOURCE,
        );

        commitCpuPlay();
      }, CPU_THINK_TIME);

    return () => {
      window.clearTimeout(
        timerId,
      );
    };
  }, [
    currentPlayerIndex,
    hands,
    fieldPlay,
    ruleContext,
    playedCards,
    consecutivePasses,
    lastPlayPlayerIndex,
    isRoundFinished,
    isRuleEffectPlaying,
  ]);
}