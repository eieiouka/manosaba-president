function TurnControls({
  canPlay,
  canPass,
  turnSeconds = null,
  onPlayCard,
  onPassTurn,
}) {
  return (
    <div
      className={`actionButtons ${
        canPass
          ? "playerTurn"
          : ""
      }`}
    >
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
          {turnSeconds ?? "－"}
        </strong>

        <span className="turnCountdownUnit">
          秒
        </span>
      </button>

      <button
        type="button"
        className="passButton passOnly"
        onClick={onPassTurn}
        disabled={!canPass}
      >
        <span className="passButtonLabel">
          PASS
        </span>
      </button>
    </div>
  );
}

export default TurnControls;
