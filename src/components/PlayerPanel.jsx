import OpponentHand from "./OpponentHand";

function PlayerPanel({
  player,
  debugMode,
  isPassing,
}) {
  return (
    <section
      className={`playerPanel ${player.position}`}
    >
      <div className="playerPortraitSlot">
        <img
          className="playerPortrait"
          src={player.image}
          alt={`${player.name}のアイコン`}
          draggable="false"
        />

        {isPassing && (
          <div className="passAvatarEffect">
            PASS
          </div>
        )}
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
      </div>

      <OpponentHand
        cards={player.hand}
        debugMode={debugMode}
      />
    </section>
  );
}

export default PlayerPanel;