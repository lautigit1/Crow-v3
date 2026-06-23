import {
  createElement,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

type HoverableProps = {
  /** Element/component to render. Defaults to "div". */
  as?: ElementType;
  style?: CSSProperties;
  /** Styles merged on top of `style` while hovered. */
  hoverStyle?: CSSProperties;
  /** Styles merged on top of `style` while focused. */
  focusStyle?: CSSProperties;
  children?: ReactNode;
  // Any extra DOM/anchor/button props (href, onClick, type, name, target, etc.)
  [key: string]: unknown;
};

/**
 * Renders any element with inline `style`, plus optional `hoverStyle` /
 * `focusStyle` that are merged in on the relevant pointer/focus state.
 * This reproduces the `style-hover` / `style-focus` behaviour from the
 * original DC-runtime templates while keeping everything as inline styles.
 */
export default function Hoverable({
  as = "div",
  style,
  hoverStyle,
  focusStyle,
  children,
  ...rest
}: HoverableProps) {
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

  // The merged props are intentionally loosely typed (the element type is
  // polymorphic via `as`), so we hand them to createElement untyped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createElement(as, handlers as any, children);
}
