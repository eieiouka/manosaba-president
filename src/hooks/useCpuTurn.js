import {
  useEffect,
  useRef,
} from "react";

import {
  canBeatPlay,
  getAllValidPlays,
  resolvePlayAgainstField,
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
  getFinishRushGroupCount,
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
          allCpuPlays
            .filter((play) =>
              canBeatPlay(
                play.analysis,
                fieldPlay,
                {
                  ...ruleContext,

                  candidateCards:
                    play.cards,
                },
              ),
            )
            .map((play) => ({
              ...play,
              analysis:
                resolvePlayAgainstField(
                  play.analysis,
                  fieldPlay,
                  ruleContext,
                ),
            }));

        /*
          単独Jokerへのスペ3返しは、CPU戦略より
          上位の強制応答として扱う。

          手札分割・組数・2人読みの結果にかかわらず、
          合法なスペ3があれば必ず出す。
        */
        const currentFieldCards =
          ruleContext.fieldCards ??
          playedCards;

        const fieldIsSingleJoker =
          currentFieldCards?.length === 1 &&
          (
            currentFieldCards[0].isJoker ||
            currentFieldCards[0].suit ===
              "joker"
          );

        const forcedSpadeThreeResponse =
          fieldIsSingleJoker
            ? rawLegalCpuPlays.find(
                (play) =>
                  play.cards.length === 1 &&
                  !play.cards[0].isJoker &&
                  play.cards[0].suit ===
                    "spades" &&
                  play.cards[0].rank === 3,
              ) ?? null
            : null;

        const knowledge =
          cpuCardKnowledge?.[
            cpuIndex
          ] ?? null;

        let legalCpuPlays =
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

        /*
          通常時の22は、単に1組減るというだけでは
          出さない。

          22を出した後の自然な手札が1組以下なら、
          親を取ってそのまま上がりへ繋げられる
          強い形として使用を許可する。

          例：
            3・9・22 → 残り2組なので22を出さない
            567・22 → 残り1組なので22を使用可能
        */
        if (
          !ruleContext.revolution &&
          !ruleContext.elevenBack
        ) {
          const naturalDeuceCount =
            cpuHand.filter(
              (card) =>
                !card.isJoker &&
                card.suit !== "joker" &&
                card.rank === 2,
            ).length;

          legalCpuPlays =
            legalCpuPlays.filter(
              (play) => {
                const isNaturalDeucePair =
                  play.analysis.type ===
                    "pair" &&
                  play.cards.length === 2 &&
                  play.cards.every(
                    (card) =>
                      !card.isJoker &&
                      card.suit !== "joker" &&
                      card.rank === 2,
                  );

                if (!isNaturalDeucePair) {
                  return true;
                }

                /*
                  222を持っている時は22を出しても
                  単独2が残るため、22温存フィルターを
                  発動させない。
                */
                if (naturalDeuceCount >= 3) {
                  return true;
                }

                const playedIds = new Set(
                  play.cardIds,
                );

                const remainingHand =
                  cpuHand.filter(
                    (card) =>
                      !playedIds.has(card.id),
                  );

                if (remainingHand.length === 0) {
                  return true;
                }

                const remainingIds = new Set(
                  remainingHand.map(
                    (card) => card.id,
                  ),
                );

                const remainingPlays =
                  allCpuPlays.filter(
                    (candidate) =>
                      candidate.cardIds.every(
                        (cardId) =>
                          remainingIds.has(
                            cardId,
                          ),
                      ),
                  );

                const remainingGroupCount =
                  getFinishRushGroupCount({
                    hand: remainingHand,
                    allValidPlays:
                      remainingPlays,
                    ruleContext,
                  });

                return (
                  remainingGroupCount <= 1
                );
              },
            );
        }

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
          !forcedSpadeThreeResponse &&
          headsUpDecision?.type === "pass"
        ) {
          handlePassRef.current(
            cpuIndex,
          );
          return;
        }

        let chosenPlay =
          forcedSpadeThreeResponse ??
          (headsUpDecision?.type === "play"
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
            : (ruleContext.elevenBack &&
          !ruleContext.revolution
                ? chooseElevenBackThreePlay(
                    {
                      hand: cpuHand,
                      allValidPlays:
                        allCpuPlays,
                      legalPlays:
                        legalCpuPlays,
                    },
                  )
                : null));

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
    isRoundFinished,
    isRuleEffectPlaying,
    isPaused,
  ]);
}
