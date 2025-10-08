
/**
 * Small badge component used to show ok / no states.
 */
export default function Badge({ ok, trueText = "Yes", falseText = "No" }) {
  return (
    <span className={`badge ${ok ? "badge--ok" : "badge--no"}`}>
      {ok ? trueText : falseText}
    </span>
  );
}
