"use client";

import { useEffect, useRef, useState } from "react";
import { CarouselCard } from "./CarouselCard";
import type { Listing } from "@/types";

const RADIUS     = 850;
const GAP        = 22;    // degrees per slot unit
const HALF       = 3;     // slots each side of centre → 7 total
const SLOTS      = HALF * 2 + 1;
const SPEED      = 0.004; // deg / ms
const FADE_FROM  = HALF - 1; // absPos ≤ 2 → fully opaque
const FADE_RANGE = 2;         // opacity 1 → 0 over 2 more slot units (absPos 2 → 4)

// Wrap a raw virtual position to the ring [-HALF-1, HALF] range.
// When rawVirt crosses -4, it teleports to +3 (off-screen left → off-screen right).
function wrapVirt(raw: number): number {
  const mod = ((raw % SLOTS) + SLOTS) % SLOTS;
  return mod > HALF ? mod - SLOTS : mod;
}

function slotOpacity(virtPos: number): number {
  const abs = Math.abs(virtPos);
  if (abs <= FADE_FROM) return 1;
  return Math.max(0, 1 - (abs - FADE_FROM) / FADE_RANGE);
}

export function ArcCarousel({ listings }: { listings: Listing[] }) {
  const n = listings.length;
  if (n === 0) return null;

  // 4× repetition so nextListingRef can cycle freely without running out
  const items = [...listings, ...listings, ...listings, ...listings];
  const count = items.length;

  const slotRefs         = useRef<(HTMLDivElement | null)[]>(Array(SLOTS).fill(null));
  const accRef           = useRef(0);
  const prevTimeRef      = useRef(0);
  const rafRef           = useRef<number>(0);
  const isPausedRef      = useRef(false);
  const prevVirtRef      = useRef(Array.from({ length: SLOTS }, (_, i) => i - HALF));
  const slotIdxRef       = useRef(Array.from({ length: SLOTS }, (_, i) => i % count));
  const nextListingRef   = useRef(SLOTS % count);

  const [slotListings, setSlotListings] = useState<number[]>(() => slotIdxRef.current.slice());

  useEffect(() => {
    const tick = (t: number) => {
      if (prevTimeRef.current) {
        if (!isPausedRef.current) {
          accRef.current += (t - prevTimeRef.current) * SPEED;
        }

        const offset = accRef.current / GAP; // fractional slot units elapsed
        let needsUpdate = false;

        slotRefs.current.forEach((el, i) => {
          if (!el) return;

          const rawVirt = (i - HALF) - offset;
          const virt    = wrapVirt(rawVirt);
          const prev    = prevVirtRef.current[i];

          // A wrap occurred: virt jumped from ≈ -HALF to ≈ +HALF
          // (difference > SLOTS/2 means the ring flipped)
          if (virt - prev > SLOTS / 2) {
            slotIdxRef.current[i] = nextListingRef.current % count;
            nextListingRef.current++;
            needsUpdate = true;
          }
          prevVirtRef.current[i] = virt;

          const angleDeg = virt * GAP;
          const angleRad = angleDeg * (Math.PI / 180);
          const x        = Math.sin(angleRad) * RADIUS;
          const y        = RADIUS - Math.cos(angleRad) * RADIUS;
          const scale    = Math.max(0.82, 1 - Math.abs(angleDeg) * 0.0025);
          const opacity  = slotOpacity(virt);

          el.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${angleDeg}deg) scale(${scale})`;
          el.style.opacity   = opacity.toFixed(3);
        });

        if (needsUpdate) setSlotListings([...slotIdxRef.current]);
      }

      prevTimeRef.current = t;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [count]);

  return (
    <div
      className="relative select-none"
      style={{ height: "360px", overflow: "visible", overflowX: "clip" }}
    >
      {Array.from({ length: SLOTS }).map((_, i) => {
        const initVirt  = i - HALF;
        const initAngle = initVirt * GAP;
        const initRad   = initAngle * (Math.PI / 180);
        const initX     = Math.sin(initRad) * RADIUS;
        const initY     = RADIUS - Math.cos(initRad) * RADIUS;
        const initScale = Math.max(0.82, 1 - Math.abs(initAngle) * 0.0025);
        const initOp    = slotOpacity(initVirt);

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
            <div
              className="transition-transform duration-300 ease-out hover:scale-[1.07] cursor-pointer"
              onMouseEnter={() => { isPausedRef.current = true; }}
              onMouseLeave={() => { isPausedRef.current = false; }}
            >
              <CarouselCard listing={items[slotListings[i]]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
