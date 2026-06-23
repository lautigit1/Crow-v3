import type * as React from "react";
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { color, font, radius } from "@/shared/config/theme";

const labelStyle: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".06em",
  color: color.textFaint,
  textTransform: "uppercase",
};

const controlBase: CSSProperties = {
  height: 46,
  padding: "0 14px",
  border: "1px solid " + color.border,
  borderRadius: radius.sm,
  fontFamily: font.body,
  fontSize: 15,
  color: color.text,
  background: "#fff",
  outline: "none",
  width: "100%",
  transition: "border-color .15s, box-shadow .15s",
};

const focusRing = { borderColor: color.primary, boxShadow: `0 0 0 3px ${color.primarySoft}` };

export function Field({ label, children, hint }: { label?: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {label && <span style={labelStyle}>{label}</span>}
      {children}
      {hint && <span style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint }}>{hint}</span>}
    </label>
  );
}

// Loosely typed on purpose: these wrappers forward arbitrary DOM props
// (value, onChange, placeholder, type, etc.) to the underlying control.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputProps = { style?: CSSProperties } & Record<string, any>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ style, ...rest }, ref) => {
  const onFocus = rest.onFocus as ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined;
  const onBlur = rest.onBlur as ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined;
  return (
    <input
      ref={ref}
      {...rest}
      style={{ ...controlBase, ...style }}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusRing);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = color.border;
        e.currentTarget.style.boxShadow = "none";
        onBlur?.(e);
      }}
    />
  );
});
Input.displayName = "Input";

export function Textarea({ style, ...rest }: InputProps) {
  return (
    <textarea
      {...rest}
      style={{ ...controlBase, height: "auto", padding: "12px 14px", lineHeight: 1.5, resize: "vertical", ...style }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = color.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export function Select({ style, children, ...rest }: InputProps & { children: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select {...rest} style={{ ...controlBase, paddingRight: 34, cursor: "pointer", ...style }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: color.textFaint, fontSize: 11 }}>
        ▾
      </span>
    </div>
  );
}
