import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useCpuTurn from "./useCpuTurn";
import useFieldRules from "./useFieldRules";
import useRoundFlow from "./useRoundFlow";

import {
  createGameHands,
} from "../utils/presidentDeck";

import {
  analyzePlay,
  canBeatPlay,
  getAllValidPlays,
  getPlayableCardIds,
  resolvePlayAgainstField,
} from "../utils/presidentRules";

import {
  playGameSound,
} from "../utils/gameAudio";

import {
  buildCpuCardKnowledge,
  cardToNumber,
  createCpuCardMemories,
  recordCardExchange,
  recordPlayerElimination,
  recordPublicPlay,
} from "../utils/cpuCardMemory";

const PLAYER_COUNT = 4;

function getRandomPlayerIndex() {
  return Math.floor(
    Math.random() * PLAYER_COUNT,
  );
}

const PASS_VOICE_SOURCES = [
  "/audio/nanoka-pass.mp3",
  "/audio/ema-pass.mp3",
  "/audio/sherry-pass.mp3",
  "/audio/hanna-pass.mp3",
];

const FINISH_VOICE_SOURCES = [
  "/audio/nanoka-finish.mp3",
  "/audio/ema-finish.mp3",
  "/audio/sherry-finish.mp3",
  "/audio/hanna-finish.mp3",
];

function playPassVoice(playerIndex) {
  const source =
    PASS_VOICE_SOURCES[
      playerIndex
    ];

  if (!source) {
    return;
  }

  playGameSound(source);
}

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
    .map((player) => player.index);
}

function getNextActivePlayerIndex(
  hands,
  currentPlayerIndex,
) {
  for (
    let offset = 1;
    offset <= PLAYER_COUNT;
    offset += 1
  ) {
    const nextIndex =
      (currentPlayerIndex + offset) %
      PLAYER_COUNT;

    if (hands[nextIndex].length > 0) {
      return nextIndex;
    }
  }

  return null;
}

function getRequiredPassCount(
  hands,
  lastPlayPlayerIndex,
) {
  const activePlayers =
    getActivePlayerIndexes(hands);

  if (lastPlayPlayerIndex === null) {
    return 0;
  }

  if (
    hands[lastPlayPlayerIndex]
      .length > 0
  ) {
    return Math.max(
      activePlayers.length - 1,
      0,
    );
  }

  return activePlayers.length;
}

function getLeaderAfterClear(
  hands,
  lastPlayPlayerIndex,
) {
  if (lastPlayPlayerIndex === null) {
    return null;
  }

  if (
    hands[lastPlayPlayerIndex]
      .length > 0
  ) {
    return lastPlayPlayerIndex;
  }

  return getNextActivePlayerIndex(
    hands,
    lastPlayPlayerIndex,
  );
}

export default function usePresidentGame({
  animateCpuCards,
  isGameActive = true,
  playerRanks = [],
} = {}) {
  const [hands, setHands] =
    useState(createGameHands);

  const [
    publicPlayedCardNumbers,
    setPublicPlayedCardNumbers,
  ] = useState([]);

  const [
    cpuCardMemories,
    setCpuCardMemories,
  ] = useState(() =>
    createCpuCardMemories(hands),
  );

  const [
    currentPlayerIndex,
    setCurrentPlayerIndex,
  ] = useState(getRandomPlayerIndex);

  const [
    selectedCardIds,
    setSelectedCardIds,
  ] = useState([]);

  const [
    playedCards,
    setPlayedCards,
  ] = useState([]);

  const [
    playedAnalysis,
    setPlayedAnalysis,
  ] = useState(null);

  const [
    lastPlayPlayerIndex,
    setLastPlayPlayerIndex,
  ] = useState(null);

  const [
    consecutivePasses,
    setConsecutivePasses,
  ] = useState(0);

  const [
    passEffectPlayerIndexes,
    setPassEffectPlayerIndexes,
  ] = useState([]);

  /*
  自分のターンが戻ってきたら
  そのプレイヤーのPASS表示を消す。
  */
  useEffect(() => {
    setPassEffectPlayerIndexes(
      (current) =>
        current.filter(
          (playerIndex) =>
            playerIndex !==
            currentPlayerIndex,
        ),
    );
  }, [
    currentPlayerIndex,
  ]);

  const hand = hands[0];

  const cpuCardKnowledge =
    useMemo(
      () =>
        buildCpuCardKnowledge({
          memories: cpuCardMemories,
          hands,
          publicPlayedCardNumbers,
        }),
      [
        cpuCardMemories,
        hands,
        publicPlayedCardNumbers,
      ],
    );

  const {
    finishOrder,
    rankByPlayer,
    normalFinishOrder,
    penaltyOrder,
    forbiddenFinishPlayerIndexes,
    forbiddenFinishPlayerIndex,
    capitalFallPlayerIndex,
    isRoundFinished,
    registerFinish,
    resetRoundFinish,
  } = useRoundFlow({
    playerCount: PLAYER_COUNT,
    playerRanks,
  });

  const {
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
  } = useFieldRules({
    hands,
    playedCards,
    setPlayedCards,
    setPlayedAnalysis,
    setLastPlayPlayerIndex,
    setConsecutivePasses,
    setCurrentPlayerIndex,
    getNextPlayerIndex:
      getNextActivePlayerIndex,
  });

  const voicedFinishPlayersRef = useRef(
    new Set(),
  );

  /*
    正常に手札を出し切ったプレイヤーの
    上がりボイスを、そのラウンドで一度だけ流す。

    forbiddenFinishPlayerIndexesやpenaltyOrderではなく
    normalFinishOrderだけを見るため、
    禁止上がり・都落ちでは再生されない。
  */
  useEffect(() => {
    if (normalFinishOrder.length === 0) {
      voicedFinishPlayersRef.current =
        new Set();
      return;
    }

    const newlyFinishedPlayerIndex =
      [...normalFinishOrder]
        .reverse()
        .find(
          (playerIndex) =>
            !voicedFinishPlayersRef
              .current
              .has(playerIndex),
        );

    if (
      newlyFinishedPlayerIndex ===
      undefined
    ) {
      return;
    }

    voicedFinishPlayersRef.current.add(
      newlyFinishedPlayerIndex,
    );

    const source =
      FINISH_VOICE_SOURCES[
        newlyFinishedPlayerIndex
      ];

    if (source) {
      playGameSound(source);
    }
  }, [normalFinishOrder]);

  const fieldPlay =
    useMemo(
      () =>
        playedCards.length > 0 &&
        playedAnalysis
          ? playedAnalysis
          : analyzePlay(
              playedCards,
              {
                revolution,
                elevenBack,
              },
            ),
      [
        playedCards,
        playedAnalysis,
        revolution,
        elevenBack,
      ],
    );

  const selectedCards =
    hand.filter((card) =>
      selectedCardIds.includes(
        card.id,
      ),
    );

  const selectedPlay =
    analyzePlay(
      selectedCards,
      {
        revolution,
        elevenBack,
      },
    );

  const ruleContext =
    useMemo(
      () => ({
        revolution,
        elevenBack,
        lockedSuit,
        gekiShibari,
        singleStrengthHistory,
        fieldCards: playedCards,
      }),
      [
        revolution,
        elevenBack,
        lockedSuit,
        gekiShibari,
        singleStrengthHistory,
        playedCards,
      ],
    );

  const allPlayerPlays =
    useMemo(
      () =>
        getAllValidPlays(
          hand,
          {
            revolution,
            elevenBack,
          },
        ),
      [
        hand,
        revolution,
        elevenBack,
      ],
    );

  const legalPlayerPlays =
    useMemo(
      () =>
        allPlayerPlays.filter(
          (play) =>
            canBeatPlay(
              play.analysis,
              fieldPlay,
              {
                ...ruleContext,
                candidateCards:
                  play.cards,
              },
            ),
        ),
      [
        allPlayerPlays,
        fieldPlay,
        ruleContext,
      ],
    );

  const playableCardIds =
    useMemo(() => {
      if (
        !isGameActive ||
        currentPlayerIndex !== 0 ||
        isRoundFinished ||
        isRuleEffectPlaying
      ) {
        return [];
      }

      return getPlayableCardIds(
        legalPlayerPlays,
        selectedCardIds,
      );
    }, [
      legalPlayerPlays,
      selectedCardIds,
      currentPlayerIndex,
      isRoundFinished,
      isRuleEffectPlaying,
      isGameActive,
    ]);

  const canPlaySelectedCards =
    isGameActive &&
    currentPlayerIndex === 0 &&
    !isRoundFinished &&
    !isRuleEffectPlaying &&
    selectedPlay.valid &&
    canBeatPlay(
      selectedPlay,
      fieldPlay,
      {
        ...ruleContext,
        candidateCards:
          selectedCards,
      },
    );

  function commitPlay({
    playerIndex,
    play,
  }) {
    const resolvedAnalysis =
      resolvePlayAgainstField(
        play.analysis,
        fieldPlay,
        {
          revolution,
          elevenBack,
        },
      );

    setPlayedAnalysis(
      resolvedAnalysis,
    );

    setPublicPlayedCardNumbers(
      (current) => [
        ...current,
        ...play.cards.map(cardToNumber),
      ],
    );

    setCpuCardMemories(
      (current) =>
        recordPublicPlay({
          memories: current,
          playerIndex,
          cards: play.cards,
        }),
    );

    const chosenIds =
      new Set(play.cardIds);

    const nextHands =
      hands.map(
        (currentHand, index) =>
          index === playerIndex
            ? currentHand.filter(
                (card) =>
                  !chosenIds.has(
                    card.id,
                  ),
              )
            : currentHand,
      );

    const {
      forbiddenFinish,
      finishEvent,
      leadingEvents,
      capitalFallPlayerIndex:
        newCapitalFallPlayerIndex,
    } = registerFinish({
      playerIndex,
      cards: play.cards,
      nextHands,
    });

    const resolvedHands =
      newCapitalFallPlayerIndex === null
        ? nextHands
        : nextHands.map(
            (currentHand, index) =>
              index ===
              newCapitalFallPlayerIndex
                ? []
                : currentHand,
          );

    if (
      newCapitalFallPlayerIndex !== null
    ) {
      setCpuCardMemories(
        (current) =>
          recordPlayerElimination({
            memories: current,
            playerIndex:
              newCapitalFallPlayerIndex,
          }),
      );
    }

    setHands(resolvedHands);

    applyPlayRules({
      cards: play.cards,
      analysis: resolvedAnalysis,
      playerIndex,
      nextHands: resolvedHands,
      forbiddenFinish,
      finishEvent,
      leadingEvents,
    });
  }

  function toggleCardSelection(card) {
    if (
      !isGameActive ||
      currentPlayerIndex !== 0 ||
      isRoundFinished ||
      isRuleEffectPlaying
    ) {
      return;
    }

    if (
      selectedCardIds.includes(
        card.id,
      )
    ) {
      setSelectedCardIds(
        (current) =>
          current.filter(
            (cardId) =>
              cardId !== card.id,
          ),
      );
      return;
    }

    if (
      !playableCardIds.includes(
        card.id,
      )
    ) {
      return;
    }

    setSelectedCardIds(
      (current) => [
        ...current,
        card.id,
      ],
    );
  }

  function playSelectedCards() {
    if (!canPlaySelectedCards) {
      return;
    }

    const selectedSet =
      new Set(selectedCardIds);

    const cardsToPlay =
      hand.filter((card) =>
        selectedSet.has(card.id),
      );

    commitPlay({
      playerIndex: 0,
      play: {
        cards: cardsToPlay,
        cardIds: cardsToPlay.map(
          (card) => card.id,
        ),
        analysis:
          analyzePlay(
            cardsToPlay,
            {
              revolution,
              elevenBack,
            },
          ),
      },
    });

    setSelectedCardIds([]);
  }

  function clearFieldByPasses() {
    const leader =
      getLeaderAfterClear(
        hands,
        lastPlayPlayerIndex,
      );

    setPlayedCards([]);
    setPlayedAnalysis(null);
    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);
    clearRuleEffects();
    resetTemporaryFieldRules();

    if (leader !== null) {
      setCurrentPlayerIndex(leader);
    }
  }

  function handlePass(playerIndex) {
    if (playedCards.length === 0) {
      return;
    }

    /*
      人間・CPU共通の
      パス音とPASS表示。
    */
    playPassVoice(playerIndex);

    setPassEffectPlayerIndexes(
      (current) =>
        current.includes(playerIndex)
          ? current
          : [
              ...current,
              playerIndex,
            ],
    );

    const nextPassCount =
      consecutivePasses + 1;

    const requiredPassCount =
      getRequiredPassCount(
        hands,
        lastPlayPlayerIndex,
      );

    if (
      nextPassCount >=
        requiredPassCount &&
      lastPlayPlayerIndex !== null
    ) {
      clearFieldByPasses();
      return;
    }

    setConsecutivePasses(
      nextPassCount,
    );

    const nextPlayer =
      getNextActivePlayerIndex(
        hands,
        playerIndex,
      );

    if (nextPlayer !== null) {
      setCurrentPlayerIndex(
        nextPlayer,
      );
    }
  }

  function passTurn() {
    if (
      !isGameActive ||
      currentPlayerIndex !== 0 ||
      isRoundFinished ||
      isRuleEffectPlaying
    ) {
      return;
    }

    setSelectedCardIds([]);
    handlePass(0);
  }

  useCpuTurn({
    currentPlayerIndex,
    hands,
    playerRanks,
    fieldPlay,
    ruleContext,
    cpuCardKnowledge,
    playedCards,
    consecutivePasses,
    lastPlayPlayerIndex,
    isRoundFinished,
    isRuleEffectPlaying,
    isPaused: !isGameActive,
    animateCpuCards,

    getNextPlayerIndex:
      getNextActivePlayerIndex,

    setCurrentPlayerIndex,
    commitPlay,
    handlePass,
  });

  /*
    ==============================
    次のラウンドを開始
    ==============================
  */
  function startNextRound({
    startingPlayerIndex = 0,
  } = {}) {
    /*
      新しくカードを配る。
    */
    const nextHands = createGameHands();

    setHands(nextHands);
    setPublicPlayedCardNumbers([]);
    setCpuCardMemories(
      createCpuCardMemories(nextHands),
    );

    /*
      ターンを初期化。
    */
    setCurrentPlayerIndex(
      startingPlayerIndex,
    );

    /*
      カード選択を解除。
    */
    setSelectedCardIds([]);

    /*
      場を空にする。
    */
    setPlayedCards([]);
    setPlayedAnalysis(null);
    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);

    /*
      PASS表示を全部消す。
    */
    setPassEffectPlayerIndexes([]);

    /*
      特殊ルールとエフェクトを解除。
    */
    resetFieldRules();

    /*
      順位記録をリセット。
    */
    resetRoundFinish();
  }

  function completeCardExchange(
    exchangedHands,
    exchangeInformation = null,
  ) {
    if (exchangeInformation) {
      setCpuCardMemories(
        (current) =>
          recordCardExchange({
            memories: current,
            handsBeforeExchange: hands,
            playerRanks:
              exchangeInformation.playerRanks,
            outgoingCardIdsByPlayer:
              exchangeInformation
                .outgoingCardIdsByPlayer,
          }),
      );
    }

    setHands(exchangedHands);
    setSelectedCardIds([]);
  }

  return {
    hands,
    hand,

    publicPlayedCardNumbers,
    cpuCardMemories,
    cpuCardKnowledge,

    currentPlayerIndex,

    selectedCardIds,
    selectedCards,
    selectedPlay,

    playableCardIds,
    canPlaySelectedCards,

    playedCards,
    fieldPlay,

    revolution,
    elevenBack,
    lockedSuit,
    gekiShibari,
    singleStrengthHistory,

    lastRuleEvents,
    activeRuleEffect,
    isRuleEffectPlaying,

    passEffectPlayerIndexes,

    finishOrder,
    rankByPlayer,
    normalFinishOrder,
    penaltyOrder,

    forbiddenFinishPlayerIndexes,
    forbiddenFinishPlayerIndex,
    capitalFallPlayerIndex,
    isRoundFinished,

    toggleCardSelection,
    playSelectedCards,
    passTurn,

    startNextRound,
    completeCardExchange,
  };
}
