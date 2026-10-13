import { Select } from "@/components/ui";

const TIMES = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

/** Half-hour steps from 7:00 to 21:00, labelled the French way ("9 h 30"). */
export function TimeSelect({ name, defaultValue, label }: { name: string; defaultValue: string; label: string }) {
  return (
    <span className="w-32">
      <Select name={name} defaultValue={defaultValue} aria-label={label}>
        {TIMES.map((t) => (
          <option key={t} value={t}>
            {Number(t.slice(0, 2))} h {t.slice(3) === "00" ? "" : t.slice(3)}
          </option>
        ))}
      </Select>
    </span>
  );
}
