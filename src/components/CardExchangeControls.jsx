function CardExchangeControls({
  canExchange,
  onExchange,
}) {
  return (
    <div className="actionButtons exchangeActionButtons">
      <button
        type="button"
        className="playCardButton exchangeButton"
        disabled={!canExchange}
        onClick={onExchange}
      >
        <span className="playButtonLabel">
          交換
        </span>
      </button>
    </div>
  );
}

export default CardExchangeControls;
