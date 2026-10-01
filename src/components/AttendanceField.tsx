import { FieldError } from "./FieldError";

const OPTIONS = [
  { value: "yes", label: "Hadir", icon: "✓" },
  { value: "no", label: "Tidak hadir", icon: "✕" },
];

export function AttendanceField({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  return (
    <fieldset aria-describedby={error ? "attending-error" : undefined}>
      <legend className="label">Konfirmasi kehadiran</legend>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <label key={opt.value}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-700 has-focus-visible:ring-4 has-focus-visible:ring-brand-100 ${
              error ? "border-red-400 bg-red-50/40" : "border-zinc-300"
            }`}>
            <input type="radio" name="attending" value={opt.value}
              defaultChecked={defaultValue === opt.value} aria-invalid={!!error} className="sr-only" />
            <span aria-hidden>{opt.icon}</span> {opt.label}
          </label>
        ))}
      </div>
      <FieldError id="attending-error" message={error} />
    </fieldset>
  );
}
