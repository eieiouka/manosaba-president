function TurnControls({
  canPlay,
  onPlayCard,
  onPassTurn,
}) {
  return (
    <div className="actionButtons">
      <button
        type="button"
        className="playCardButton"
        onClick={onPlayCard}
        disabled={!canPlay}
      >
        <span className="playButtonLabel">
          カードを出す
        </span>

        <strong className="turnCountdown">
          －
        </strong>

        <span className="turnCountdownUnit">
          秒
        </span>
      </button>

      <button
        type="button"
        className="passButton passOnly"
        onClick={onPassTurn}
      >
        <span className="passButtonLabel">
          PASS
        </span>
      </button>
    </div>
  );
}

export default TurnControls;