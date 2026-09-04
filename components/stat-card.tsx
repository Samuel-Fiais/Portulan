export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="fp-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toString().padStart(2, "0")}</div>
      <div className="stat-delta delta-up">{note}</div>
    </div>
  );
}
