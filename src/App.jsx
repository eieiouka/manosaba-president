import "./App.css";

import FieldArea from "./components/FieldArea";
import PlayerPanel from "./components/PlayerPanel";
import PlayingCard from "./components/PlayingCard";
import TurnControls from "./components/TurnControls";

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
    viewportWidth - PAGE_PADDING * 2,
    1,
  );

  const availableHeight = Math.max(
    viewportHeight - PAGE_PADDING * 2,
    1,
  );

  return Math.min(
    availableWidth / GAME_WIDTH,
    availableHeight / GAME_HEIGHT,
    1,
  );
}

function App() {
  const gameScale = useGameScale(
    calculateGameScale,
  );

  const {
    hands,
    hand,
    selectedCardIds,
    playedCards,
    toggleCardSelection,
    playSelectedCards,
    passTurn,
  } = usePresidentGame();

  const displayedOpponents =
    opponents.map(
      (player, index) => ({
        ...player,
        cardCount:
          hands[index + 1].length,
      }),
    );

  return (
    <main className="gamePage">
      <div
        className="gameFrame"
        style={{
          width:
            GAME_WIDTH * gameScale,
          height:
            GAME_HEIGHT * gameScale,
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
            <div className="roundDisplay">
              <span>
                ROUND
              </span>

              <strong>
                1 / 5
              </strong>
            </div>

            {displayedOpponents.map(
              (player) => (
                <PlayerPanel
                  player={player}
                  key={player.id}
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
                <img
                  className="yourPortrait"
                  src="/characters/nanoka.png"
                  alt="黒部ナノカのアイコン"
                  draggable="false"
                />

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
                        card={card}
                        index={
                          index
                        }
                        selected={
                          selectedCardIds.includes(
                            card.id,
                          )
                        }
                        onToggle={
                          toggleCardSelection
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
                  selectedCardIds.length >
                  0
                }
                onPlayCard={
                  playSelectedCards
                }
                onPassTurn={
                  passTurn
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