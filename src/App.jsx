import "./App.css";
import useGameScale from "./hooks/useGameScale";

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
    position: "playerLeft",
    cardCount: 9,
    rank: "平民",
  },
  {
    id: "sherry",
    name: "橘シェリー",
    shortName: "SHERRY",
    position: "playerTop",
    cardCount: 7,
    rank: "富豪",
  },
  {
    id: "hanna",
    name: "遠野ハンナ",
    shortName: "HANNA",
    position: "playerRight",
    cardCount: 10,
    rank: "貧民",
  },
];

const hand = [
  {
    id: "spades-3",
    suit: "spades",
    rank: 3,
  },
  {
    id: "diamonds-4",
    suit: "diamonds",
    rank: 4,
  },
  {
    id: "clubs-5",
    suit: "clubs",
    rank: 5,
  },
  {
    id: "hearts-7",
    suit: "hearts",
    rank: 7,
  },
  {
    id: "spades-8",
    suit: "spades",
    rank: 8,
  },
  {
    id: "diamonds-9",
    suit: "diamonds",
    rank: 9,
  },
  {
    id: "clubs-10",
    suit: "clubs",
    rank: 10,
  },
  {
    id: "hearts-11",
    suit: "hearts",
    rank: 11,
  },
  {
    id: "spades-12",
    suit: "spades",
    rank: 12,
  },
  {
    id: "diamonds-13",
    suit: "diamonds",
    rank: 13,
  },
  {
    id: "hearts-1",
    suit: "hearts",
    rank: 1,
  },
  {
    id: "clubs-2",
    suit: "clubs",
    rank: 2,
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

function getCardImagePath(suitId, rank) {
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

function PlayerPanel({ player }) {
  return (
    <section
      className={`playerPanel ${player.position}`}
    >
      <div className="playerPortrait">
        <span>{player.shortName}</span>
      </div>

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
          <strong>{player.cardCount}</strong>
          <span>枚</span>
        </div>
      </div>
    </section>
  );
}

function PlayingCard({ card, index }) {
  const suit = suits.find(
    (item) => item.id === card.suit,
  );

  return (
    <button
      className="playingCard"
      style={{
        "--hand-index": index,
        zIndex: index + 1,
      }}
      type="button"
      aria-label={`${suit?.symbol ?? ""}${getRankLabel(
        card.rank,
      )}`}
    >
      <img
        src={getCardImagePath(
          card.suit,
          card.rank,
        )}
        alt={`${suit?.symbol ?? ""}${getRankLabel(
          card.rank,
        )}`}
        draggable="false"
      />
    </button>
  );
}

function FieldCard({
  suit,
  rank,
  className = "",
}) {
  const suitData = suits.find(
    (item) => item.id === suit,
  );

  return (
    <div className={`fieldCard ${className}`}>
      <img
        src={getCardImagePath(suit, rank)}
        alt={`${suitData?.symbol ?? ""}${getRankLabel(
          rank,
        )}`}
        draggable="false"
      />
    </div>
  );
}

function App() {
  const gameScale = useGameScale(
    calculateGameScale,
  );

  return (
    <main className="gamePage">
      <div
        className="gameFrame"
        style={{
          width: GAME_WIDTH * gameScale,
          height: GAME_HEIGHT * gameScale,
        }}
      >
        <div
          className="gameCanvas"
          style={{
            transform: `scale(${gameScale})`,
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
              <p>MANOSABA CARD GAMES</p>
              <h1>PRESIDENT</h1>
              <span>大富豪</span>
            </div>

            <div className="roundDisplay">
              <span>ROUND</span>
              <strong>1 / 5</strong>
            </div>
          </header>

          <section className="gameTable">
            {opponents.map((player) => (
              <PlayerPanel
                player={player}
                key={player.id}
              />
            ))}

            <div className="statusArea">
              <div className="turnBadge">
                <span>TURN</span>
                <strong>黒部ナノカ</strong>
              </div>

              <div className="ruleBadges">
                <span>通常</span>
                <span>革命なし</span>
              </div>
            </div>

            <div className="fieldArea">
              <div className="fieldDecoration">
                <span>PLAY AREA</span>
              </div>

              <div className="fieldCards">
                <FieldCard
                  suit="clubs"
                  rank={8}
                  className="fieldCardLeft"
                />

                <FieldCard
                  suit="hearts"
                  rank={8}
                  className="fieldCardRight"
                />
              </div>

              <p className="fieldMessage">8切り</p>
            </div>

            <section className="yourArea">
              <div className="yourInformation">
                <div className="yourPortrait">
                  <span>NANOKA</span>
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
                data-count={hand.length}
              >
                <div className="playerHandTrack">
                  {hand.map((card, index) => (
                    <PlayingCard
                      card={card}
                      index={index}
                      key={card.id}
                    />
                  ))}
                </div>
              </div>

              <div className="actionButtons">
                <button
                  className="playButton"
                  type="button"
                >
                  カードを出す
                </button>

                <button
                  className="passButton"
                  type="button"
                >
                  パス
                </button>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;