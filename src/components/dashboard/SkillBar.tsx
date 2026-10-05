export function SkillBar({
  label,
  value,
}: {
  label: string;
  value: number; // 0–100
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-mist-200">{label}</span>
        <span className="text-mist-400">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full bg-teal-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
