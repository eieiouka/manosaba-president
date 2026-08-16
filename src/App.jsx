import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import FieldArea from "./components/FieldArea";
import PlayerPanel from "./components/PlayerPanel";
import PlayingCard from "./components/PlayingCard";
import TurnControls from "./components/TurnControls";
import RuleEffectOverlay from "./components/RuleEffectOverlay";
import CardExchangeControls from "./components/CardExchangeControls";

import RoundScoreNotebook from "./components/RoundScoreNotebook";
import FinalMatchResult from "./components/FinalMatchResult";

import useCardAnimation from "./hooks/useCardAnimation";
import useGameScale from "./hooks/useGameScale";
import usePresidentGame from "./hooks/usePresidentGame";

import {
  createExchangedHands,
  getExchangeCount,
  getExchangePlayableCardIds,
  getCpuExchangeCardIds,
  isValidExchangeSelection,
} from "./utils/cardExchangeUtils";

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PAGE_PADDING,
  opponents,
} from "./constants/presidentConstants";

const TOTAL_ROUNDS = 5;

const GAME_PHASES = {
  PLAYING: "playing",
  ROUND_RESULT: "roundResult",
  EXCHANGE: "exchange",
  FINAL_RESULT: "finalResult",
};

const RANKS_BY_PLACE = [
  "大富豪",
  "富豪",
  "貧民",
  "大貧民",
];

function createRanksFromFinishOrder(
  finishOrder,
) {
  const nextRanks = [
    "平民",
    "平民",
    "平民",
    "平民",
  ];

  finishOrder.forEach(
    (
      playerIndex,
      place,
    ) => {
      nextRanks[playerIndex] =
        RANKS_BY_PLACE[place];
    },
  );

  return nextRanks;
}

function calculateGameScale() {
  const viewportWidth =
    window.visualViewport?.width ??
    window.innerWidth;

  const viewportHeight =
    window.visualViewport?.height ??
    window.innerHeight;

  const availableWidth = Math.max(
    viewportWidth -
      PAGE_PADDING * 2,
    1,
  );

  const availableHeight = Math.max(
    viewportHeight -
      PAGE_PADDING * 2,
    1,
  );

  return Math.min(
    availableWidth / GAME_WIDTH,
    availableHeight / GAME_HEIGHT,
    1,
  );
}

function App() {
  const [
    debugMode,
    setDebugMode,
  ] = useState(false);

  const [gamePhase, setGamePhase] =
    useState(GAME_PHASES.PLAYING);

  const [
    exchangeSelectedCardIds,
    setExchangeSelectedCardIds,
  ] = useState([]);

  const [
    roundNumber,
    setRoundNumber,
  ] = useState(1);

  const [
    savedRounds,
    setSavedRounds,
  ] = useState([]);

  /*
    現在のゲーム開始時点での階級。

    1回戦目は全員平民。
  */
  const [
    playerRanks,
    setPlayerRanks,
  ] = useState([
    "平民",
    "平民",
    "平民",
    "平民",
  ]);

  const gameScale =
    useGameScale(
      calculateGameScale,
    );

  const {
    isAnimating,
    animateCards,
    animateCpuCards,
  } = useCardAnimation();

  const {
    hands,
    hand,

    currentPlayerIndex,

    selectedCardIds,
    selectedCards,

    selectedPlay,
    playableCardIds,
    canPlaySelectedCards,

    playedCards,

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
    completeCardExchange,
  } = usePresidentGame({
    animateCpuCards,
    isGameActive:
      gamePhase ===
      GAME_PHASES.PLAYING,
  });

  useEffect(() => {
    if (
      gamePhase !==
        GAME_PHASES.PLAYING ||
      !isRoundFinished ||
      isRuleEffectPlaying
    ) {
      return;
    }

    setGamePhase(
      GAME_PHASES.ROUND_RESULT,
    );
  }, [
    gamePhase,
    isRoundFinished,
    isRuleEffectPlaying,
  ]);

  const canPass =
    gamePhase ===
      GAME_PHASES.PLAYING &&
    currentPlayerIndex === 0 &&
    playedCards.length > 0 &&
    !isAnimating &&
    !isRuleEffectPlaying &&
    !isRoundFinished;

  const isExchangePhase =
    gamePhase === GAME_PHASES.EXCHANGE;

  const exchangeCount =
    getExchangeCount(playerRanks[0]);

  const exchangePlayableCardIds =
    isExchangePhase
      ? getExchangePlayableCardIds({
          hand,
          rank: playerRanks[0],
          selectedCardIds:
            exchangeSelectedCardIds,
        })
      : [];

  const canConfirmExchange =
    isExchangePhase &&
    isValidExchangeSelection({
      hand,
      rank: playerRanks[0],
      selectedCardIds:
        exchangeSelectedCardIds,
    });

  /*
    =====================================
    今回のゲームで確定した階級
    =====================================

    正常上がり：
    1人目 → 大富豪
    2人目 → 富豪
    3人目 → 貧民

    禁止上がり：
    → 大貧民

    最後まで残った一人：
    → 大貧民
  */
  const getFinishedRank = (
    playerIndex,
  ) => {
    /*
      Joker禁止上がり。
    */
    if (
      forbiddenFinishPlayerIndex ===
      playerIndex
    ) {
      return "大貧民";
    }

    /*
      正常に上がった人。
    */
    const normalPlace =
      normalFinishOrder.indexOf(
        playerIndex,
      );

    if (normalPlace !== -1) {
      return (
        RANKS_BY_PLACE[
          normalPlace
        ] ?? null
      );
    }

    /*
      ゲーム終了時。

      最後まで残った人も
      finishOrderから階級を取得。
    */
    if (isRoundFinished) {
      const finalPlace =
        finishOrder.indexOf(
          playerIndex,
        );

      if (finalPlace !== -1) {
        return (
          RANKS_BY_PLACE[
            finalPlace
          ] ?? null
        );
      }
    }

    return null;
  };

  /*
    ナノカの今回確定階級。
  */
  const yourFinishedRank =
    getFinishedRank(0);

  /*
    CPU表示データ。

    hands[0] = ナノカ
    hands[1] = エマ
    hands[2] = シェリー
    hands[3] = ハンナ
  */
  const displayedOpponents =
    opponents.map(
      (
        player,
        index,
      ) => {
        const playerIndex =
          index + 1;

        const cpuHand =
          hands[
            playerIndex
          ];

        return {
          ...player,

          /*
            前回ゲームで決まった
            現在階級。
          */
          rank:
            playerRanks[
              playerIndex
            ],

          cardCount:
            cpuHand.length,

          hand:
            cpuHand,

          /*
            今回すでに
            上がっている場合の階級。
          */
          finishedRank:
            getFinishedRank(
              playerIndex,
            ),
        };
      },
    );

  const handlePlayCard = () => {
    if (
      gamePhase !==
        GAME_PHASES.PLAYING ||
      isAnimating
    ) {
      return;
    }

    if (!selectedPlay.valid) {
      return;
    }

    if (
      selectedCards.length ===
      0
    ) {
      return;
    }

    animateCards({
      cards:
        selectedCards,

      onLanding:
        playSelectedCards,
    });
  };

  const handlePassTurn = () => {
    if (
      gamePhase !==
        GAME_PHASES.PLAYING ||
      isAnimating
    ) {
      return;
    }

    passTurn();
  };

  const handleToggleCard = (
    card,
  ) => {
    if (isExchangePhase) {
      setExchangeSelectedCardIds(
        (current) => {
          if (current.includes(card.id)) {
            return current.filter(
              (cardId) =>
                cardId !== card.id,
            );
          }

          if (
            current.length >=
              exchangeCount ||
            !exchangePlayableCardIds.includes(
              card.id,
            )
          ) {
            return current;
          }

          return [...current, card.id];
        },
      );

      return;
    }

    if (
      gamePhase !==
        GAME_PHASES.PLAYING ||
      isAnimating
    ) {
      return;
    }

    toggleCardSelection(
      card,
    );
  };

  /*
    =====================================
    戦績保存
    =====================================
  */
  const saveCurrentRound = () => {
    setSavedRounds(
      (current) => {
        const alreadySaved =
          current.some(
            (round) =>
              round.roundNumber ===
              roundNumber,
          );

        if (alreadySaved) {
          return current;
        }

        return [
          ...current,
          {
            roundNumber,

            finishOrder: [
              ...finishOrder,
            ],
          },
        ];
      },
    );
  };

  /*
    =====================================
    次のゲームへ
    =====================================
  */
  const handleNextRound = () => {
    /*
      今回の戦績を保存。
    */
    saveCurrentRound();

    /*
      今回の順位を
      次回ゲームの階級へ反映。
    */
    setPlayerRanks(
      createRanksFromFinishOrder(
        finishOrder,
      ),
    );

    /*
      新しく53枚を配る。
    */
    startNextRound();

    setGamePhase(
      GAME_PHASES.EXCHANGE,
    );

    setExchangeSelectedCardIds([]);

    /*
      ROUNDを進める。
    */
    setRoundNumber(
      (current) =>
        Math.min(
          current + 1,
          TOTAL_ROUNDS,
        ),
    );
  };

  const handleConfirmExchange = () => {
    if (!canConfirmExchange) {
      return;
    }

    const outgoingCardIdsByPlayer =
      hands.map(
        (playerHand, playerIndex) =>
          playerIndex === 0
            ? exchangeSelectedCardIds
            : getCpuExchangeCardIds(
                playerHand,
                playerRanks[
                  playerIndex
                ],
              ),
      );

    const exchangedHands =
      createExchangedHands({
        hands,
        playerRanks,
        outgoingCardIdsByPlayer,
      });

    completeCardExchange(
      exchangedHands,
    );

    setExchangeSelectedCardIds([]);

    setGamePhase(
      GAME_PHASES.PLAYING,
    );
  };

  /*
    =====================================
    5回戦終了
    =====================================
  */
  const handleFinishMatch = () => {
    saveCurrentRound();

    setGamePhase(
      GAME_PHASES.FINAL_RESULT,
    );
  };

  return (
    <main className="gamePage">
      <div
        className="gameFrame"
        style={{
          width:
            GAME_WIDTH *
            gameScale,

          height:
            GAME_HEIGHT *
            gameScale,
        }}
      >
        <div
          className="gameCanvas"
          style={{
            transform:
              `scale(${gameScale})`,
          }}
        >
          <header className="gameHeader">
            <button
              className="hubButton"
              type="button"
            >
              ← HUBへ戻る
            </button>

            <div className="gameTitle">
              <p>
                MANOSABA CARD GAMES
              </p>

              <h1>
                PRESIDENT
              </h1>

              <span>
                大富豪
              </span>
            </div>

            <button
              className="restartButton"
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              やり直す
            </button>
          </header>

          <section className="gameTable">
            {/*
              革命・8切り・上がり等
            */}
            <RuleEffectOverlay
              effect={
                activeRuleEffect
              }
            />

            {/*
              DEBUG
            */}
            <button
              type="button"
              onClick={() => {
                setDebugMode(
                  (current) =>
                    !current,
                );
              }}
              style={{
                position:
                  "absolute",

                top:
                  "20px",

                left:
                  "20px",

                zIndex:
                  100,

                width:
                  "120px",

                height:
                  "42px",

                border:
                  debugMode
                    ? "2px solid #ff4055"
                    : "1px solid rgba(211, 174, 96, 0.7)",

                borderRadius:
                  "8px",

                background:
                  debugMode
                    ? "rgba(100, 15, 25, 0.95)"
                    : "rgba(15, 8, 10, 0.9)",

                color:
                  debugMode
                    ? "#ff7080"
                    : "#d3ae60",

                fontSize:
                  "14px",

                fontWeight:
                  "700",

                cursor:
                  "pointer",

                letterSpacing:
                  "0.08em",
              }}
            >
              DEBUG{" "}
              {debugMode
                ? "ON"
                : "OFF"}
            </button>

            {/*
              ROUND
            */}
            <div className="roundDisplay">
              <span>
                ROUND
              </span>

              <strong>
                {roundNumber} /{" "}
                {TOTAL_ROUNDS}
              </strong>
            </div>

            {/*
              CPU3人
            */}
            {displayedOpponents.map(
              (
                player,
                index,
              ) => (
                <PlayerPanel
                  player={
                    player
                  }
                  debugMode={
                    debugMode
                  }
                  finishedRank={
                    player.finishedRank
                  }
                  isPassing={
                    passEffectPlayerIndexes.includes(
                      index + 1,
                    )
                  }
                  key={
                    player.id
                  }
                />
              ),
            )}

            {/*
              場
            */}
            <FieldArea
              playedCards={
                playedCards
              }
            />

            {/*
              ナノカ
            */}
            <section
              className={`yourArea ${
                isExchangePhase
                  ? "exchangeMode"
                  : ""
              }`}
            >
              <div className="yourInformation">
                <div className="yourPortraitSlot">
                  <img
                    className="yourPortrait"
                    src="/characters/nanoka.png"
                    alt="黒部ナノカのアイコン"
                    draggable="false"
                  />

                  {passEffectPlayerIndexes.includes(
                    0,
                  ) && (
                    <div className="passAvatarEffect">
                      PASS
                    </div>
                  )}
                </div>

                <div className="yourText">
                  <p className="yourName">
                    黒部ナノカ
                  </p>

                  <p className="yourRank">
                    {
                      playerRanks[
                        0
                      ]
                    }
                  </p>
                </div>
              </div>

              {/*
                ナノカがまだ上がっていない
                → 普通の手札。

                上がった
                → 手札の代わりに階級。
              */}
              {yourFinishedRank ? (
                <div className="playerFinishedRank">
                  <span>
                    {
                      yourFinishedRank
                    }
                  </span>
                </div>
              ) : (
                <div
                  className="playerHand"
                  data-count={
                    hand.length
                  }
                >
                  <div className="playerHandTrack">
                    {hand.map(
                      (
                        card,
                        index,
                      ) => (
                        <PlayingCard
                          card={
                            card
                          }
                          index={
                            index
                          }
                          selected={
                            (
                              isExchangePhase
                                ? exchangeSelectedCardIds
                                : selectedCardIds
                            ).includes(card.id)
                          }
                          playable={
                            (
                              isExchangePhase
                                ? exchangePlayableCardIds
                                : playableCardIds
                            ).includes(card.id)
                          }
                          playableVariant={
                            isExchangePhase
                              ? "exchange"
                              : "play"
                          }
                          onToggle={
                            handleToggleCard
                          }
                          key={
                            card.id
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

              {isExchangePhase ? (
                <CardExchangeControls
                  canExchange={
                    canConfirmExchange
                  }
                  onExchange={
                    handleConfirmExchange
                  }
                />
              ) : (
                <TurnControls
                  canPlay={
                    canPlaySelectedCards &&
                    !isAnimating
                  }
                  canPass={
                    canPass
                  }
                  onPlayCard={
                    handlePlayCard
                  }
                  onPassTurn={
                    handlePassTurn
                  }
                />
              )}
            </section>

            {/*
              全順位確定後。

              上がりエフェクトが
              全部終了するまでは
              戦績表を表示しない。
            */}
            {gamePhase ===
              GAME_PHASES.ROUND_RESULT && (
                <RoundScoreNotebook
                  roundNumber={
                    roundNumber
                  }
                  savedRounds={
                    savedRounds
                  }
                  finishOrder={
                    finishOrder
                  }
                  onNextRound={
                    handleNextRound
                  }
                  onFinishMatch={
                    handleFinishMatch
                  }
                />
              )}

            {/*
              5回戦終了後の
              最終結果。
            */}
            {gamePhase ===
              GAME_PHASES.FINAL_RESULT && (
              <FinalMatchResult
                savedRounds={
                  savedRounds
                }
                roundNumber={
                  roundNumber
                }
                finishOrder={
                  finishOrder
                }
                onRestart={() => {
                  window.location.reload();
                }}
                onBackToHub={() => {
                  window.location.href =
                    "https://manosaba-cardgame-hub.vercel.app/";
                }}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
