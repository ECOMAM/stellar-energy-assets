/**
 * Neutral stand-in for the photo of a project without a descriptive sheet
 * (lib/projectMeta.ts): a plain CSS gradient, so no stock image suggests a
 * site, size or location the project never declared.
 */
export default function ProjectImagePlaceholder({
  className = "",
  label = "Sin imagen · proyecto sin ficha descriptiva",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 via-slate-100 to-amber-50 px-4 text-center text-slate-400 ${className}`}
    >
      <span className="material-symbols-outlined text-[40px]" aria-hidden="true">
        solar_power
      </span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}
