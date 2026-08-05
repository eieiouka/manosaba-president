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

export default OpponentHand;