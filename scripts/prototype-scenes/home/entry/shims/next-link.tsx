import { forwardRef, type AnchorHTMLAttributes } from "react";
// next/link as a plain anchor that goes nowhere.
const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean }>(
  ({ prefetch: _p, scroll: _s, replace: _r, onClick, ...rest }, ref) => (
    <a ref={ref} {...rest} onClick={(e) => { e.preventDefault(); onClick?.(e); }} />
  ),
);
Link.displayName = "Link";
export default Link;
