import {
  getCardImagePath,
  getCardLabel,
} from "../utils/cardUtils";

function PlayingCard({
  card,
  index,
  selected,
  onToggle,
}) {
  const cardLabel =
    getCardLabel(card);

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

export default PlayingCard;