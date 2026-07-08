import { color } from "@/shared/config/theme";

/**
 * `size` and `stroke` stay dynamic (inline style): callers pass different
 * numbers/colors and Tailwind can't turn a runtime prop into a static class.
 * The spin animation keeps its exact 0.7s duration via an arbitrary value
 * referencing the `spin` keyframe already defined in app/styles/index.css
 * (Tailwind's built-in `animate-spin` utility runs at 1s, which would be a
 * real behavior change here).
 */
export function Spinner({ size = 20, stroke = color.primary }: { size?: number; stroke?: string }) {
  return (
    <span
      className="inline-block border-2 border-border rounded-full animate-[spin_0.7s_linear_infinite]"
      style={{ width: size, height: size, borderTopColor: stroke }}
    />
  );
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-[14px] py-20 px-0">
      <Spinner size={28} />
      {label && <span className="font-[Inter,sans-serif] text-[14px] text-textFaint">{label}</span>}
    </div>
  );
}
