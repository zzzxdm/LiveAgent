import { type ReactNode, useEffect, useState } from "react";

import { cn } from "../../../lib/shared/utils";

// Collapsible region whose body mounts on first expand and stays mounted
// forever after. Collapsed-from-birth content costs nothing — no Streamdown
// parse, no shiki highlight, no diff build, no DOM — which is what makes
// scrolling a settled transcript cheap; once revealed it keeps its state
// exactly like the old always-mounted markup (the settle zero-remount
// invariant holds because the latch lives in components whose keys carry
// over). The grid-rows transition needs the body in the DOM before it can
// animate, so a mounting expand renders collapsed and flips open on the next
// frame; reduced-motion expands instantly.

// Pure decision for the open/renderedOpen reconciliation, exported for tests.
export function resolveLazyCollapseTransition(params: {
  open: boolean;
  renderedOpen: boolean;
  reducedMotion: boolean;
}): "none" | "collapse" | "expand-now" | "expand-next-frame" {
  const { open, renderedOpen, reducedMotion } = params;
  if (open === renderedOpen) return "none";
  if (!open) return "collapse";
  return reducedMotion ? "expand-now" : "expand-next-frame";
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function LazyCollapse(props: {
  open: boolean;
  className?: string;
  children: () => ReactNode;
}) {
  const { open, className, children } = props;
  const [mounted, setMounted] = useState(open);
  const [renderedOpen, setRenderedOpen] = useState(open);
  if (open && !mounted) {
    // Render-phase latch: the body must be in this commit's DOM so the
    // next-frame flip has real content to animate to.
    setMounted(true);
  }

  useEffect(() => {
    const transition = resolveLazyCollapseTransition({
      open,
      renderedOpen,
      reducedMotion: prefersReducedMotion(),
    });
    if (transition === "none") return;
    if (transition !== "expand-next-frame") {
      setRenderedOpen(open);
      return;
    }
    const frame = requestAnimationFrame(() => setRenderedOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [open, renderedOpen]);

  return (
    <div
      aria-hidden={!renderedOpen}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
        renderedOpen
          ? "grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{mounted ? children() : null}</div>
    </div>
  );
}
