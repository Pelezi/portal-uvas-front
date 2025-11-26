"use client";

import React, { useEffect, useRef, useState } from "react";

type CollapseProps = {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
};

export default function Collapse({ isOpen, children, className = "", duration = 300 }: CollapseProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<string>("0px");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const runOpen = () => {
      // Measure
      const height = el.scrollHeight;
      // Set to measured height to animate
      setMaxHeight(`${height}px`);
      // After transition end, remove max-height to allow natural height
      const onEnd = () => {
        if (isOpen) setMaxHeight("none");
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    };

    const runClose = () => {
      // If currently 'none', set to measured height first so we can animate to 0
      const current = getComputedStyle(el).maxHeight;
      if (current === "none") {
        const height = el.scrollHeight;
        setMaxHeight(`${height}px`);
        // next frame set to 0
        requestAnimationFrame(() => requestAnimationFrame(() => setMaxHeight("0px")));
      } else {
        // animate from current value to 0
        setMaxHeight("0px");
      }
    };

    if (isOpen) runOpen(); else runClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const style: React.CSSProperties = {
    maxHeight,
    overflow: "hidden",
    transition: `max-height ${duration}ms ease, opacity ${duration}ms ease`,
    opacity: isOpen ? 1 : 0,
  };

  return (
    <div className={className} aria-hidden={!isOpen}>
      <div ref={ref} style={style}>
        {/* Render children inside an inner wrapper so scrollHeight is accurate */}
        <div className="pt-0 pb-2">{children}</div>
      </div>
    </div>
  );
}
