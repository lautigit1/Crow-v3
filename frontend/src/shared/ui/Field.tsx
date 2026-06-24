import type * as React from "react";
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { color, font, radius } from "@/shared/config/theme";

export function Field({ label, children, hint }: { label?: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <span style={{
          fontFamily: font.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".14em",
          color: color.ink700,
          textTransform: "uppercase",
        }}>
          {label}
        </span>
      )}
      {children}
      {hint && (
        <span style={{ fontFamily: font.body, fontSize: 11.5, color: color.textFaint, marginTop: -2 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputProps = { style?: CSSProperties } & Record<string, any>;

const base: CSSProperties = {
  height: 40,
  padding: "0 12px",
  border: `1.5px solid ${color.border}`,
  borderRadius: radius.sm,
  fontFamily: font.body,
  fontSize: 14,
  color: color.ink900,
  background: color.surface,
  outline: "none",
  width: "100%",
  transition: "border-color .15s, box-shadow .15s, background .15s",
  boxSizing: "border-box" as const,
};

const focus: CSSProperties = {
  borderColor: color.primary,
  background: "#fff",
  boxShadow: `0 0 0 3px rgba(0,87,217,.1)`,
};

const blur: CSSProperties = {
  borderColor: color.border,
  background: color.surface,
  boxShadow: "none",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({ style, onFocus, onBlur, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    style={{ ...base, ...style }}
    onFocus={(e) => { Object.assign(e.currentTarget.style, focus); (onFocus as ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined)?.(e); }}
    onBlur={(e)  => { Object.assign(e.currentTarget.style, blur);  (onBlur  as ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined)?.(e); }}
  />
));
Input.displayName = "Input";

export function Textarea({ style, ...rest }: InputProps) {
  return (
    <textarea
      {...rest}
      style={{ ...base, height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical", ...style }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focus)}
      onBlur={(e)  => Object.assign(e.currentTarget.style, blur)}
    />
  );
}

export function Select({ style, children, ...rest }: InputProps & { children: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        {...rest}
        style={{ ...base, paddingRight: 32, cursor: "pointer", appearance: "none", WebkitAppearance: "none", ...style }}
        onFocus={(e) => Object.assign(e.currentTarget.style, focus)}
        onBlur={(e)  => Object.assign(e.currentTarget.style, blur)}
      >
        {children}
      </select>
      <svg
        width={12} height={12} viewBox="0 0 24 24" fill="none"
        stroke={color.textFaint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
