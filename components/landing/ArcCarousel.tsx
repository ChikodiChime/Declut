"use client";

import { useEffect, useRef, useState } from "react";
import { CarouselCard } from "./CarouselCard";
import type { Listing } from "@/types";

const RADIUS     = 850;           // px — radius of the virtual circle
const GAP        = 22;            // degrees between card centres
const HALF       = 3;             // cards each side of centre → 7 total slots
const SLOTS      = HALF * 2 + 1;
const SPEED      = 0.004;         // degrees per ms ≈ 0.24 deg/s

export function ArcCarousel({ listings }: { listings: Listing[] }) {
  const items = listings.length > 0
    ? [...listings, ...listings, ...listings, ...listings]
    : [];
  const n = items.length;

  const slotRefs    = useRef<(HTMLDivElement | null)[]>(Array(SLOTS).fill(null));
  const prevRef     = useRef(0);
  const accRef      = useRef(0);
  const stepRef     = useRef(0);
  const rafRef      = useRef<number>(0);
  const isPausedRef = useRef(false);

  // React state only changes when a slot cycles to a new listing (~every 5–6 s)
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!n) return;

    const tick = (t: number) => {
      if (prevRef.current) {
        if (!isPausedRef.current) {
          accRef.current += (t - prevRef.current) * SPEED;
        }

        const frac = accRef.current % GAP;

        slotRefs.current.forEach((el, i) => {
          if (!el) return;
          const angleDeg = (i - HALF) * GAP - frac;
          const angleRad = angleDeg * (Math.PI / 180);
          const x        = Math.sin(angleRad) * RADIUS;
          const y        = RADIUS - Math.cos(angleRad) * RADIUS;
          const absAngle = Math.abs(angleDeg);
          const opacity  = Math.max(0, 1 - absAngle / ((HALF + 1) * GAP));
          const scale    = Math.max(0.82, 1 - absAngle * 0.0025);

          el.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${angleDeg}deg) scale(${scale})`;
          el.style.opacity   = opacity.toFixed(3);
        });

        const newStep = Math.floor(accRef.current / GAP);
        if (newStep !== stepRef.current) {
          stepRef.current = newStep;
          setStep(newStep);
        }
      }

      prevRef.current = t;
      rafRef.current  = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [n]);

  if (!n) return null;

  return (
    <div
      className="relative select-none"
      style={{
        height: "360px",
        overflow: "visible",
        // clip-on-x only: prevents horizontal scroll without creating a block-formatting
        // context, so cards can still bleed visually into the next section below.
        overflowX: "clip",
      }}
    >
      {Array.from({ length: SLOTS }).map((_, i) => {
        const listingIdx = ((step + i) % n + n) % n;

        const initAngle = (i - HALF) * GAP;
        const initRad   = initAngle * (Math.PI / 180);
        const initX     = Math.sin(initRad) * RADIUS;
        const initY     = RADIUS - Math.cos(initRad) * RADIUS;
        const initAbs   = Math.abs(initAngle);
        const initOp    = Math.max(0, 1 - initAbs / ((HALF + 1) * GAP));
        const initScale = Math.max(0.82, 1 - initAbs * 0.0025);

        return (
          <div
            key={i}
            ref={(el) => { slotRefs.current[i] = el; }}
            className="absolute"
            style={{
              left: "50%",
              top: 0,
              transform: `translateX(calc(-50% + ${initX}px)) translateY(${initY}px) rotate(${initAngle}deg) scale(${initScale})`,
              opacity: initOp,
              willChange: "transform, opacity",
            }}
          >
            {/* Inner wrapper: CSS handles hover scale; refs handle pause — no React re-render on hover */}
            <div
              className="transition-transform duration-300 ease-out hover:scale-[1.07] cursor-pointer"
              onMouseEnter={() => { isPausedRef.current = true; }}
              onMouseLeave={() => { isPausedRef.current = false; }}
            >
              <CarouselCard listing={items[listingIdx]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
