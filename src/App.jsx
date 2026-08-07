import {
  useState,
} from "react";

import "./App.css";

import FieldArea from "./components/FieldArea";
import PlayerPanel from "./components/PlayerPanel";
import PlayingCard from "./components/PlayingCard";
import TurnControls from "./components/TurnControls";
import RuleEffectOverlay from "./components/RuleEffectOverlay";

import useCardAnimation from "./hooks/useCardAnimation";
import useGameScale from "./hooks/useGameScale";
import usePresidentGame from "./hooks/usePresidentGame";

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PAGE_PADDING,
  opponents,
} from "./constants/presidentConstants";

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
  const [debugMode, setDebugMode] =
    useState(false);

  const gameScale =
    useGameScale(
      calculateGameScale,
    );

  const {
    hands,
    hand,

    selectedCardIds,
    selectedCards,

    selectedPlay,
    playableCardIds,
    canPlaySelectedCards,

    playedCards,

    activeRuleEffect,
    passEffectPlayerIndex,

    toggleCardSelection,
    playSelectedCards,
    passTurn,
  } = usePresidentGame();

  const {
    isAnimating,
    animateCards,
  } = useCardAnimation();

  /*
    CPUの表示データ。

    hands[0] = ナノカ
    hands[1] = エマ
    hands[2] = シェリー
    hands[3] = ハンナ

    CPUには枚数だけでなく、
    実際の手札も渡す。
  */
  const displayedOpponents =
    opponents.map(
      (player, index) => {
        const cpuHand =
          hands[index + 1];

        return {
          ...player,

          cardCount:
            cpuHand.length,

          hand:
            cpuHand,
        };
      },
    );

  const handlePlayCard = () => {
    if (isAnimating) {
      return;
    }

    if (!selectedPlay.valid) {
      return;
    }

    if (
      selectedCards.length === 0
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
    if (isAnimating) {
      return;
    }

    passTurn();
  };

  const handleToggleCard = (
    card,
  ) => {
    if (isAnimating) {
      return;
    }

    toggleCardSelection(
      card,
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
            <RuleEffectOverlay
              effect={activeRuleEffect}
            />
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

                top: "20px",
                left: "20px",

                zIndex: 100,

                width: "120px",
                height: "42px",

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

            <div className="roundDisplay">
              <span>
                ROUND
              </span>

              <strong>
                1 / 5
              </strong>
            </div>

            {displayedOpponents.map(
              (player, index) => (
                <PlayerPanel
                  player={
                    player
                  }
                  debugMode={
                    debugMode
                  }
                  isPassing={
                    passEffectPlayerIndex ===
                    index + 1
                  }
                  key={
                    player.id
                  }
                />
              ),
            )}

            <FieldArea
              playedCards={
                playedCards
              }
            />

            <section className="yourArea">
              <div className="yourInformation">
                <div className="yourPortraitSlot">
                  <img
                    className="yourPortrait"
                    src="/characters/nanoka.png"
                    alt="黒部ナノカのアイコン"
                    draggable="false"
                  />

                  {passEffectPlayerIndex === 0 && (
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
                    平民
                  </p>
                </div>
              </div>

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
                          selectedCardIds.includes(
                            card.id,
                          )
                        }
                        playable={
                          playableCardIds.includes(
                            card.id,
                          )
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

              <TurnControls
                canPlay={
                  canPlaySelectedCards &&
                  !isAnimating
                }
                onPlayCard={
                  handlePlayCard
                }
                onPassTurn={
                  handlePassTurn
                }
              />
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;