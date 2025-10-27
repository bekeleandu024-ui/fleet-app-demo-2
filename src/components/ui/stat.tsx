export default function Stat({
  value,
  label
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="stat">{value}</div>
      <div className="stat-sub">{label}</div>
    </div>
  );
}
