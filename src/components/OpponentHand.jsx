import {
  getCardImagePath,
} from "../utils/cardUtils";

function OpponentHand({
  cards,
  debugMode = false,
}) {
  const count =
    cards.length;

  const opponentStep =
    count > 1
      ? `${100 / (count - 1)}%`
      : "0%";

  return (
    <div
      className="opponentHand"
      data-count={count}
      style={{
        "--opponent-step":
          opponentStep,
      }}
      aria-label={`残り${count}枚`}
    >
      <div className="opponentHandTrack">
        {cards.map(
          (
            card,
            index,
          ) => {
            const imageSource =
              debugMode
                ? getCardImagePath(
                    card.suit,
                    card.rank,
                  )
                : "/cards/card_back.png";

            return (
              <div
                className="opponentCard"
                key={
                  card.id
                }
                style={{
                  "--opponent-index":
                    index,

                  zIndex:
                    index + 1,
                }}
              >
                <img
                  src={
                    imageSource
                  }
                  alt={
                    debugMode
                      ? card.id
                      : ""
                  }
                  draggable="false"
                />
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

export default OpponentHand;