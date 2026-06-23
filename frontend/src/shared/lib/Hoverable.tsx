import { createElement, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

type HoverableProps = {
  as?: ElementType;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  focusStyle?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
};

/**
 * Renders any element with inline `style`, plus optional `hoverStyle` /
 * `focusStyle` merged in on the relevant pointer/focus state. Lets us keep
 * everything as inline styles while still supporting hover/focus affordances.
 */
export function Hoverable({ as = "div", style, hoverStyle, focusStyle, children, ...rest }: HoverableProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const merged: CSSProperties = {
    ...style,
    ...(hovered && hoverStyle ? hoverStyle : {}),
    ...(focused && focusStyle ? focusStyle : {}),
  };

  const handlers: Record<string, unknown> = { ...rest, style: merged };

  if (hoverStyle) {
    handlers.onMouseEnter = (e: unknown) => {
      setHovered(true);
      (rest.onMouseEnter as ((e: unknown) => void) | undefined)?.(e);
    };
    handlers.onMouseLeave = (e: unknown) => {
      setHovered(false);
      (rest.onMouseLeave as ((e: unknown) => void) | undefined)?.(e);
    };
  }
  if (focusStyle) {
    handlers.onFocus = (e: unknown) => {
      setFocused(true);
      (rest.onFocus as ((e: unknown) => void) | undefined)?.(e);
    };
    handlers.onBlur = (e: unknown) => {
      setFocused(false);
      (rest.onBlur as ((e: unknown) => void) | undefined)?.(e);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createElement(as, handlers as any, children);
}
