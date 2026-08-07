import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createGameHands,
} from "../utils/presidentDeck";

import {
  analyzePlay,
  canBeatPlay,
  getAllValidPlays,
  getPlayableCardIds,
  getPlayEffects,
  getSingleNaturalStrength,
  getSingleNaturalSuit,
  isJoker,
  isSingleJoker,
  isSpadeThree,
} from "../utils/presidentRules";

const PLAYER_COUNT = 4;
const CPU_THINK_TIME = 700;
const RULE_EFFECT_TIME = 900;

const CARD_PLAY_SOUND_SOURCE =
  "/audio/card-play.mp3";

const PASS_SOUND_SOURCE =
  "/audio/pass.mp3";

function playPassSound() {
  const audio =
    new Audio(
      PASS_SOUND_SOURCE,
    );

  audio.play().catch(() => {
    /*
      再生できなくても
      ゲームは止めない。
    */
  });
}

function playCpuCardSound() {
  const audio =
    new Audio(
      CARD_PLAY_SOUND_SOURCE,
    );

  audio.play().catch(() => {
    /*
      ブラウザに再生を
      拒否された場合は何もしない。
    */
  });
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

function containsJoker(cards) {
  return cards.some(isJoker);
}

export default function usePresidentGame() {
  const [hands, setHands] =
    useState(createGameHands);

  const [
    currentPlayerIndex,
    setCurrentPlayerIndex,
  ] = useState(0);

  const [
    selectedCardIds,
    setSelectedCardIds,
  ] = useState([]);

  const [
    playedCards,
    setPlayedCards,
  ] = useState([]);

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

  /*
    革命だけは場が流れても残る。
  */
  const [
    revolution,
    setRevolution,
  ] = useState(false);

  /*
    以下は場が流れたら解除。
  */
  const [
    elevenBack,
    setElevenBack,
  ] = useState(false);

  const [
    lockedSuit,
    setLockedSuit,
  ] = useState(null);

  const [
    gekiShibari,
    setGekiShibari,
  ] = useState(false);

  const [
    singleStrengthHistory,
    setSingleStrengthHistory,
  ] = useState([]);

  /*
    将来のエフェクト表示用。

    revolution
    shibari
    gekiShibari
    elevenBack
    eightCut
    spadeThree
    forbiddenFinish
  */
  const [
    lastRuleEvents,
    setLastRuleEvents,
  ] = useState([]);

  const [
    ruleEffectQueue,
    setRuleEffectQueue,
  ] = useState([]);

  const activeRuleEffect =
    ruleEffectQueue[0] ?? null;

  const isRuleEffectPlaying =
    ruleEffectQueue.length > 0;

  const [
    pendingSpecialClear,
    setPendingSpecialClear,
  ] = useState(null);

  /*
    正常に上がった順番。
  */
  const [
    normalFinishOrder,
    setNormalFinishOrder,
  ] = useState([]);

  /*
    Joker禁止上がりをした人。
    Jokerは1枚なので最大1人。
  */
  const [
    forbiddenFinishPlayerIndex,
    setForbiddenFinishPlayerIndex,
  ] = useState(null);

  const hand = hands[0];

  const activePlayerIndexes =
    useMemo(
      () =>
        getActivePlayerIndexes(hands),
      [hands],
    );

  /*
    最終順位。

    禁止上がりした人は
    必ず最後へ送る。
  */
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
        eliminatedCount >= 3
      ) {
        const lastPlayer =
          activePlayerIndexes[0];

        if (!order.includes(lastPlayer)) {
          order.push(lastPlayer);
        }
      }

      if (
        forbiddenFinishPlayerIndex !==
        null
      ) {
        const withoutPenalty =
          order.filter(
            (playerIndex) =>
              playerIndex !==
              forbiddenFinishPlayerIndex,
          );

        /*
          ゲーム終了前でも
          反則者は4位確定だが、
          finishOrderは順位順を
          保つため最後に置く。
        */
        if (
          eliminatedCount >= 3 &&
          activePlayerIndexes.length <= 1
        ) {
          withoutPenalty.push(
            forbiddenFinishPlayerIndex,
          );
        }

        return withoutPenalty;
      }

      return order;
    }, [
      normalFinishOrder,
      forbiddenFinishPlayerIndex,
      activePlayerIndexes,
    ]);

  const isRoundFinished =
    finishOrder.length ===
    PLAYER_COUNT;

  const fieldPlay =
    useMemo(
      () => analyzePlay(playedCards),
      [playedCards],
    );

  const selectedCards =
    hand.filter((card) =>
      selectedCardIds.includes(
        card.id,
      ),
    );

  const selectedPlay =
    analyzePlay(selectedCards);

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
      () => getAllValidPlays(hand),
      [hand],
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
    ]);

  const canPlaySelectedCards =
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

  function resetTemporaryFieldRules() {
    setElevenBack(false);
    setLockedSuit(null);
    setGekiShibari(false);
    setSingleStrengthHistory([]);
  }

  function triggerRuleEvents(events) {
    setLastRuleEvents(events);
    setRuleEffectQueue(events);
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
    /*
      まだ特殊ルール演出中なら
      カードを消さない。
    */
    if (isRuleEffectPlaying) {
      return;
    }

    /*
      8切り・スペ3返しの
      場流し予約がなければ何もしない。
    */
    if (!pendingSpecialClear) {
      return;
    }

    const {
      playerIndex,
    } = pendingSpecialClear;

    /*
      ここで初めて場札を消す。
    */
    setPlayedCards([]);

    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);

    resetTemporaryFieldRules();

    /*
      場を流したので予約解除。
    */
    setPendingSpecialClear(null);

    /*
      8切り・スペ3返しをした人が
      まだ手札を持っていれば
      その人から再開。
    */
    if (
      hands[playerIndex].length > 0
    ) {
      setCurrentPlayerIndex(
        playerIndex,
      );

      return;
    }

    /*
      そのカードで上がった場合は
      次の生存プレイヤーから。
    */
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
  }, [
    isRuleEffectPlaying,
    pendingSpecialClear,
    hands,
  ]);

  function moveToNextActive(
    nextHands,
    playerIndex,
  ) {
    const nextPlayer =
      getNextActivePlayerIndex(
        nextHands,
        playerIndex,
      );

    if (nextPlayer !== null) {
      setCurrentPlayerIndex(
        nextPlayer,
      );
    }
  }

  function clearFieldAfterSpecial(
    cards,
    playerIndex,
  ) {
    /*
      まだカードは消さない。

      演出中は、特殊ルールを
      発生させたカードを
      場に表示したままにする。
    */
    setPlayedCards(cards);

    setLastPlayPlayerIndex(
      playerIndex,
    );

    setConsecutivePasses(0);

    /*
      演出終了後に
      場を流すための予約。
    */
    setPendingSpecialClear({
      playerIndex,
    });
  }

  function registerFinish({
    playerIndex,
    cards,
    nextHands,
  }) {
    if (
      nextHands[playerIndex]
        .length !== 0
    ) {
      return false;
    }

    if (containsJoker(cards)) {
      setForbiddenFinishPlayerIndex(
        playerIndex,
      );

      return true;
    }

    setNormalFinishOrder(
      (current) =>
        current.includes(playerIndex)
          ? current
          : [...current, playerIndex],
    );

    return false;
  }

  /*
    1回のカードプレイによる
    特殊ルールを反映する。
  */
  function applyPlayRules({
    cards,
    analysis,
    playerIndex,
    nextHands,
    forbiddenFinish,
  }) {
    const effects =
      getPlayEffects(
        cards,
        analysis,
      );

    const spadeThreeReturn =
      isSingleJoker(playedCards) &&
      isSpadeThree(cards);

    /*
      スペ3返しは完全単独表示。
    */
    if (spadeThreeReturn) {
      triggerRuleEvents([
        "spadeThree",
        ...(forbiddenFinish
          ? ["forbiddenFinish"]
          : []),
      ]);

      clearFieldAfterSpecial(
        cards,
        playerIndex,
      );

      return;
    }

    const events = [];

    /*
      革命は場が流れても残る。
      4枚以上なら毎回反転する。
    */
    if (effects.revolution) {
      setRevolution(
        (current) => !current,
      );
      events.push("revolution");
    }

    /*
      8切りがある場合、
      革命だけは先に成立する。

      縛り・激シバ・11バックは
      場が即座に流れるため発生させない。
    */
    if (effects.eightCut) {
      events.push("eightCut");

      if (forbiddenFinish) {
        events.push(
          "forbiddenFinish",
        );
      }

      triggerRuleEvents(events);

      clearFieldAfterSpecial(
        cards,
        playerIndex,
      );

      return;
    }

    /*
      シングル限定の縛り・激シバ。
    */
    let nextLockedSuit = lockedSuit;
    let nextGeki = gekiShibari;

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

      /*
        激シバが新しく成立。
        通常の縛りよりこちらを優先表示。
      */
      if (
        sameSuit &&
        consecutive &&
        !gekiShibari
      ) {
        nextLockedSuit =
          candidateSuit;
        nextGeki = true;

        setLockedSuit(
          candidateSuit,
        );
        setGekiShibari(true);
        events.push("gekiShibari");
      } else if (
        sameSuit &&
        !lockedSuit
      ) {
        nextLockedSuit =
          candidateSuit;

        setLockedSuit(
          candidateSuit,
        );
        events.push("shibari");
      }

      setSingleStrengthHistory(
        (current) => [
          ...current,
          candidateStrength,
        ],
      );
    }

    /*
      Jを含んでいれば11バック。
      既に11バック中なら
      二重反転はさせず継続。
    */
    if (
      effects.elevenBack &&
      !elevenBack
    ) {
      setElevenBack(true);
      events.push("elevenBack");
    }

    if (forbiddenFinish) {
      events.push("forbiddenFinish");
    }

    triggerRuleEvents(events);

    /*
      通常の場更新。
    */
    setPlayedCards(cards);
    setLastPlayPlayerIndex(
      playerIndex,
    );
    setConsecutivePasses(0);

    /*
      nextLockedSuit / nextGekiは
      React更新前の説明用変数。
      状態自体は上で更新済み。
    */
    void nextLockedSuit;
    void nextGeki;

    moveToNextActive(
      nextHands,
      playerIndex,
    );
  }

  function commitPlay({
    playerIndex,
    play,
  }) {
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

    setHands(nextHands);

    const forbiddenFinish =
      registerFinish({
        playerIndex,
        cards: play.cards,
        nextHands,
      });

    applyPlayRules({
      cards: play.cards,
      analysis: play.analysis,
      playerIndex,
      nextHands,
      forbiddenFinish,
    });
  }

  function toggleCardSelection(card) {
    if (
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
          analyzePlay(cardsToPlay),
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
    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);
    setLastRuleEvents([]);
    setRuleEffectQueue([]);
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
    playPassSound();

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
      currentPlayerIndex !== 0 ||
      isRoundFinished ||
      isRuleEffectPlaying
    ) {
      return;
    }

    setSelectedCardIds([]);
    handlePass(0);
  }

  useEffect(() => {
    if (
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
        getNextActivePlayerIndex(
          hands,
          currentPlayerIndex,
        );

      if (nextPlayer !== null) {
        setCurrentPlayerIndex(
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
          暫定CPUは
          一番左側から作れる
          最初の合法手。
        */
        const chosenPlay =
          legalCpuPlays[0];

       if (chosenPlay) {
          playCpuCardSound();

          commitPlay({
            playerIndex: cpuIndex,
            play: chosenPlay,
          });

          return;
        }

        handlePass(cpuIndex);
      }, CPU_THINK_TIME);

    return () => {
      window.clearTimeout(timerId);
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

  /*
    ==============================
    次のラウンドを開始
    ==============================
  */
  function startNextRound() {
    /*
      新しくカードを配る。
    */
    setHands(
      createGameHands(),
    );

    /*
      ターンを初期化。
    */
    setCurrentPlayerIndex(0);

    /*
      カード選択を解除。
    */
    setSelectedCardIds([]);

    /*
      場を空にする。
    */
    setPlayedCards([]);
    setLastPlayPlayerIndex(null);
    setConsecutivePasses(0);

    /*
      PASS表示を全部消す。
    */
    setPassEffectPlayerIndexes([]);

    /*
      革命を解除。
    */
    setRevolution(false);

    /*
      11バック・縛り・激シバを解除。
    */
    setElevenBack(false);
    setLockedSuit(null);
    setGekiShibari(false);
    setSingleStrengthHistory([]);

    /*
      ルールエフェクトをリセット。
    */
    setLastRuleEvents([]);
    setRuleEffectQueue([]);
    setPendingSpecialClear(null);

    /*
      順位記録をリセット。
    */
    setNormalFinishOrder([]);
    setForbiddenFinishPlayerIndex(null);
  }

  return {
    hands,
    hand,

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
    normalFinishOrder,

    forbiddenFinishPlayerIndex,
    isRoundFinished,

    toggleCardSelection,
    playSelectedCards,
    passTurn,

    startNextRound,
  };
}