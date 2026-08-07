import OpponentHand from "./OpponentHand";

function PlayerPanel({
  player,
  debugMode,
}) {
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
          <span>
            残り
          </span>

          <strong>
            {player.cardCount}
          </strong>

          <span>
            枚
          </span>
        </div>
      </div>

      <OpponentHand
        cards={player.hand}
        debugMode={debugMode}
      />
    </section>
  );
}

export default PlayerPanel;