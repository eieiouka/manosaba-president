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

import {
  chooseElevenBackThreePlay,
  choosePresidentCpuPlay,
  filterNonBreakingSingleResponses,
  findFinishRushPlan,
  findGuaranteedFinishPlan,
} from "../utils/presidentCpuStrategy";

import {
  chooseHeadsUpPerfectPlay,
} from "../utils/presidentHeadsUpSolver";

const CPU_THINK_TIME = 700;

const CARD_PLAY_SOUND_SOURCE =
  "/audio/card-play.mp3";

export default function useCpuTurn({
  currentPlayerIndex,
  hands,
  fieldPlay,
  ruleContext,
  cpuCardKnowledge,

  playedCards,
  consecutivePasses,
  lastPlayPlayerIndex,

  isRoundFinished,
  isRuleEffectPlaying,
  isPaused = false,

  animateCpuCards,

  getNextPlayerIndex,
  setCurrentPlayerIndex,
  commitPlay,
  handlePass,
}) {
  const actionInProgressRef =
    useRef(false);

  const guaranteedPlanRef = useRef({
    playerIndex: null,
    remainingSteps: [],
  });

  const finishRushPlanRef = useRef({
    playerIndex: null,
    remainingSteps: [],
  });

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
    if (isPaused || isRoundFinished) {
      guaranteedPlanRef.current = {
        playerIndex: null,
        remainingSteps: [],
      };

      finishRushPlanRef.current = {
        playerIndex: null,
        remainingSteps: [],
      };

      return undefined;
    }

    if (
      actionInProgressRef.current ||
      currentPlayerIndex === 0 ||
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

        const allCpuPlays =
          getAllValidPlays(
            cpuHand,
            {
              revolution:
                ruleContext.revolution,
              elevenBack:
                ruleContext.elevenBack,
            },
          );

        const rawLegalCpuPlays =
          allCpuPlays.filter((play) =>
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

        const knowledge =
          cpuCardKnowledge?.[
            cpuIndex
          ] ?? null;

        const legalCpuPlays =
          filterNonBreakingSingleResponses({
            hand: cpuHand,
            allValidPlays:
              allCpuPlays,
            legalPlays:
              rawLegalCpuPlays,
            fieldPlay,
            knowledge,
            ruleContext,
          });

        const activePlayerIndexes =
          hands
            .map((playerHand, index) => ({
              index,
              cardCount:
                playerHand.length,
            }))
            .filter(
              ({ cardCount }) =>
                cardCount > 0,
            )
            .map(({ index }) => index);

        const headsUpOpponentIndex =
          activePlayerIndexes.length === 2
            ? activePlayerIndexes.find(
                (index) =>
                  index !== cpuIndex,
              )
            : null;

        const headsUpDecision =
          headsUpOpponentIndex !== null &&
          headsUpOpponentIndex !== undefined
            ? chooseHeadsUpPerfectPlay({
                ownHand: cpuHand,
                opponentCardNumbers:
                  knowledge
                    ?.remainingOpponentCardNumbers ?? [],
                opponentCardCount:
                  hands[
                    headsUpOpponentIndex
                  ].length,
                fieldCards:
                  ruleContext.fieldCards ?? [],
                ruleContext,
              })
            : null;

        if (
          headsUpDecision?.type === "pass"
        ) {
          handlePassRef.current(
            cpuIndex,
          );
          return;
        }

        let chosenPlay =
          headsUpDecision?.type === "play"
            ? rawLegalCpuPlays.find(
                (play) =>
                  play.cardIds.length ===
                    headsUpDecision.play
                      .cardIds.length &&
                  play.cardIds.every(
                    (cardId) =>
                      headsUpDecision.play
                        .cardIds.includes(
                          cardId,
                        ),
                  ),
              ) ?? null
            : ruleContext.elevenBack &&
          !ruleContext.revolution
            ? chooseElevenBackThreePlay(
                legalCpuPlays,
              )
            : null;

        const pendingPlan =
          guaranteedPlanRef.current;

        if (
          !chosenPlay &&
          pendingPlan.playerIndex ===
            cpuIndex &&
          pendingPlan.remainingSteps
            .length > 0
        ) {
          if (!fieldPlay?.valid) {
            const nextCardIds =
              pendingPlan
                .remainingSteps[0];

            chosenPlay =
              legalCpuPlays.find(
                (play) =>
                  play.cardIds.length ===
                    nextCardIds.length &&
                  play.cardIds.every(
                    (cardId) =>
                      nextCardIds.includes(
                        cardId,
                      ),
                  ),
              ) ?? null;
          }

          if (chosenPlay) {
            guaranteedPlanRef.current = {
              playerIndex: cpuIndex,
              remainingSteps:
                pendingPlan
                  .remainingSteps
                  .slice(1),
            };
          } else {
            guaranteedPlanRef.current = {
              playerIndex: null,
              remainingSteps: [],
            };
          }
        }

        if (!chosenPlay) {
          const guaranteedPlan =
            findGuaranteedFinishPlan({
              hand: cpuHand,
              allValidPlays:
                allCpuPlays,
              legalPlays:
                legalCpuPlays,
              fieldPlay,
              ruleContext,
              knowledge,
            });

          if (guaranteedPlan?.length > 0) {
            [chosenPlay] = guaranteedPlan;

            guaranteedPlanRef.current = {
              playerIndex: cpuIndex,
              remainingSteps:
                guaranteedPlan
                  .slice(1)
                  .map(
                    (play) => [
                      ...play.cardIds,
                    ],
                  ),
            };
          }
        }

        /*
          確定ではない上がりラッシュ。
          前の切り札が通って場が流れた時だけ
          次の手順へ進む。返されたら即破棄する。
        */
        if (!chosenPlay) {
          const pendingRush =
            finishRushPlanRef.current;

          if (
            pendingRush.playerIndex ===
              cpuIndex &&
            pendingRush.remainingSteps
              .length > 0
          ) {
            if (!fieldPlay?.valid) {
              const nextCardIds =
                pendingRush
                  .remainingSteps[0];

              chosenPlay =
                legalCpuPlays.find(
                  (play) =>
                    play.cardIds.length ===
                      nextCardIds.length &&
                    play.cardIds.every(
                      (cardId) =>
                        nextCardIds.includes(
                          cardId,
                        ),
                    ),
                ) ?? null;
            }

            if (chosenPlay) {
              finishRushPlanRef.current = {
                playerIndex: cpuIndex,
                remainingSteps:
                  pendingRush
                    .remainingSteps
                    .slice(1),
              };
            } else {
              finishRushPlanRef.current = {
                playerIndex: null,
                remainingSteps: [],
              };
            }
          }
        }

        if (!chosenPlay) {
          const finishRushPlan =
            findFinishRushPlan({
              hand: cpuHand,
              allValidPlays:
                allCpuPlays,
              legalPlays:
                legalCpuPlays,
              fieldPlay,
              ruleContext,
              knowledge,
            });

          if (finishRushPlan?.length > 0) {
            [chosenPlay] = finishRushPlan;

            finishRushPlanRef.current = {
              playerIndex: cpuIndex,
              remainingSteps:
                finishRushPlan
                  .slice(1)
                  .map(
                    (play) => [
                      ...play.cardIds,
                    ],
                  ),
            };
          }
        }

        if (!chosenPlay) {
          chosenPlay =
            choosePresidentCpuPlay({
              hand: cpuHand,
              allValidPlays:
                allCpuPlays,
              legalPlays:
                legalCpuPlays,
              fieldPlay,
              ruleContext,
              knowledge,
            });
        }

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
    cpuCardKnowledge,
    playedCards,
    consecutivePasses,
    lastPlayPlayerIndex,
    isRoundFinished,
    isRuleEffectPlaying,
    isPaused,
  ]);
}
