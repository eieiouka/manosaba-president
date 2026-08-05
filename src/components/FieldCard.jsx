import {
  getCardImagePath,
  getCardLabel,
} from "../utils/cardUtils";

function FieldCard({
  card,
  index,
  count,
}) {
  const cardLabel =
    getCardLabel(card);

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

export default FieldCard;