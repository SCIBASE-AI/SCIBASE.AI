interface Props {
  value: number | null;
  max?: number;
}

export function StarRating({ value, max = 5 }: Props) {
  if (value === null) return null;
  return (
    <span className="stars" aria-label={`${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? "star-filled" : "star-empty"}>
          ★
        </span>
      ))}
    </span>
  );
}
