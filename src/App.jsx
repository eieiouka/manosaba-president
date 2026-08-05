import { useState } from "react";

import "./App.css";
import TurnControls from "./components/TurnControls";
import useGameScale from "./hooks/useGameScale";

import {
  createGameHands,
} from "./utils/presidentDeck";

const GAME_WIDTH = 1500;
const GAME_HEIGHT = 1220;
const PAGE_PADDING = 16;

const suits = [
  {
    id: "spades",
    symbol: "♠",
    fileNumber: 1,
  },
  {
    id: "hearts",
    symbol: "♥",
    fileNumber: 2,
  },
  {
    id: "diamonds",
    symbol: "♦",
    fileNumber: 3,
  },
  {
    id: "clubs",
    symbol: "♣",
    fileNumber: 4,
  },
];

const opponents = [
  {
    id: "ema",
    name: "桜羽エマ",
    shortName: "EMA",
    image: "/characters/ema.png",
    position: "playerLeft",
    rank: "平民",
  },
  {
    id: "sherry",
    name: "橘シェリー",
    shortName: "SHERRY",
    image: "/characters/sherry.png",
    position: "playerTop",
    rank: "富豪",
  },
  {
    id: "hanna",
    name: "遠野ハンナ",
    shortName: "HANNA",
    image: "/characters/hanna.png",
    position: "playerRight",
    rank: "貧民",
  },
];

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

function getRankFileName(rank) {
  if (rank === 1) {
    return "A";
  }

  if (rank === 10) {
    return "T";
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return String(rank);
}

function getRankLabel(rank) {
  if (rank === 1) {
    return "A";
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return String(rank);
}

function getCardImagePath(
  suitId,
  rank,
) {
  if (suitId === "joker") {
    return "/cards/card_JOKER.png";
  }

  const suit = suits.find(
    (item) => item.id === suitId,
  );

  if (!suit) {
    return "";
  }

  return `/cards/card_${getRankFileName(
    rank,
  )}${suit.fileNumber}.png`;
}

function OpponentHand({ count }) {
  const opponentStep =
    count > 1
      ? `${100 / (count - 1)}%`
      : "0%";

  return (
    <div
      className="opponentHand"
      data-count={count}
      style={{
        "--opponent-step": opponentStep,
      }}
      aria-label={`残り${count}枚`}
    >
      <div className="opponentHandTrack">
        {Array.from({
          length: count,
        }).map((_, index) => (
          <div
            className="opponentCard"
            key={index}
            style={{
              "--opponent-index": index,
              zIndex: index + 1,
            }}
          >
            <img
              src="/cards/card_back.png"
              alt=""
              draggable="false"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerPanel({ player }) {
  return (
    <section
      className={`playerPanel ${player.position}`}
    >
      <img
        className="playerPortrait"
        src={player.image}
        alt={`${player.name}のアイコン`}
        draggable="false"
      />

      <div className="playerInformation">
        <div className="playerNameRow">
          <p className="playerName">
            {player.name}
          </p>

          <span className="playerRank">
            {player.rank}
          </span>
        </div>

        <div className="cardCountDisplay">
          <span>残り</span>

          <strong>
            {player.cardCount}
          </strong>

          <span>枚</span>
        </div>
      </div>

      <OpponentHand
        count={player.cardCount}
      />
    </section>
  );
}

function PlayingCard({
  card,
  index,
  selected,
  onToggle,
}) {
  const suit = suits.find(
    (item) => item.id === card.suit,
  );

  const cardLabel = card.isJoker
    ? "ジョーカー"
    : `${suit?.symbol ?? ""}${getRankLabel(
        card.rank,
      )}`;

  return (
    <button
      className={`playingCard ${
        selected
          ? "selectedCard"
          : ""
      }`}
      style={{
        "--hand-index": index,
        zIndex: index + 1,
      }}
      type="button"
      aria-label={cardLabel}
      onClick={() => {
        onToggle(card);
      }}
    >
      <img
        src={getCardImagePath(
          card.suit,
          card.rank,
        )}
        alt={cardLabel}
        draggable="false"
      />
    </button>
  );
}

function FieldCard({
  card,
  index,
  count,
}) {
  const suitData = suits.find(
    (item) => item.id === card.suit,
  );

  const cardLabel = card.isJoker
    ? "ジョーカー"
    : `${suitData?.symbol ?? ""}${getRankLabel(
        card.rank,
      )}`;

  const centerIndex =
    (count - 1) / 2;

  const offset =
    (index - centerIndex) * 75;

  const rotation =
    (index - centerIndex) * 2;

  return (
    <div
      className="fieldCard"
      style={{
        left:
          `calc(50% + ${offset}px)`,
        transform:
          `translateX(-50%) rotate(${rotation}deg)`,
        zIndex: index + 1,
      }}
    >
      <img
        src={getCardImagePath(
          card.suit,
          card.rank,
        )}
        alt={cardLabel}
        draggable="false"
      />
    </div>
  );
}

function App() {
  const gameScale = useGameScale(
    calculateGameScale,
  );

  /*
    53枚をシャッフルして
    4人へ配る。
  */
  const [
    hands,
    setHands,
  ] = useState(
    createGameHands,
  );

  /*
    現在選択しているカード。
  */
  const [
    selectedCardIds,
    setSelectedCardIds,
  ] = useState([]);

  /*
    現在中央の場に出ているカード。
  */
  const [
    playedCards,
    setPlayedCards,
  ] = useState([]);

  /*
    hands[0] = 黒部ナノカ
    hands[1] = 桜羽エマ
    hands[2] = 橘シェリー
    hands[3] = 遠野ハンナ
  */
  const hand = hands[0];

  /*
    相手の表示枚数を
    実際の手札枚数に連動。
  */
  const displayedOpponents =
    opponents.map(
      (player, index) => ({
        ...player,
        cardCount:
          hands[index + 1].length,
      }),
    );

  /*
    手札をクリックしたとき。

    未選択なら選択。
    選択済みなら解除。
  */
  const toggleCardSelection = (
    card,
  ) => {
    setSelectedCardIds(
      (current) => {
        if (
          current.includes(card.id)
        ) {
          return current.filter(
            (cardId) =>
              cardId !== card.id,
          );
        }

        return [
          ...current,
          card.id,
        ];
      },
    );
  };

  /*
    選択したカードを場へ出す。

    現段階では、
    カードの組み合わせが
    正しいかどうかは判定しない。
  */
  const handlePlayCard = () => {
    if (
      selectedCardIds.length === 0
    ) {
      return;
    }

    const selectedSet =
      new Set(selectedCardIds);

    const cardsToPlay =
      hand.filter(
        (card) =>
          selectedSet.has(card.id),
      );

    setHands(
      (currentHands) =>
        currentHands.map(
          (
            currentHand,
            playerIndex,
          ) => {
            if (
              playerIndex !== 0
            ) {
              return currentHand;
            }

            return currentHand.filter(
              (card) =>
                !selectedSet.has(
                  card.id,
                ),
            );
          },
        ),
    );

    /*
      今の場札を、
      今回出したカードで置き換える。
    */
    setPlayedCards(
      cardsToPlay,
    );

    /*
      出した後は選択解除。
    */
    setSelectedCardIds([]);
  };

  /*
    パスは現在無制限。

    ターン制はまだないので、
    今は選択解除だけ行う。
  */
  const handlePassTurn = () => {
    setSelectedCardIds([]);
  };

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

            <div className="fieldArea">
              <div className="fieldDecoration">
                <span>
                  PLAY AREA
                </span>
              </div>

              {playedCards.length >
                0 && (
                <div className="fieldCards">
                  {playedCards.map(
                    (
                      card,
                      index,
                    ) => (
                      <FieldCard
                        card={card}
                        index={index}
                        count={
                          playedCards.length
                        }
                        key={
                          card.id
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>

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