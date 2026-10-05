"use client";

import { useEffect } from "react";
import { motion, useMotionTemplate, useReducedMotion, useSpring, useTransform, useVelocity } from "framer-motion";

const glide = { stiffness: 230, damping: 27, mass: 1.05, restDelta: 0.01, restSpeed: 0.05 };

// Percentage coordinates keep the same spring continuous at every phone width.
export function LiquidIndicator({ index, count, variant = "segment" }: {
  index: number;
  count: number;
  variant?: "navigation" | "segment";
}) {
  const reduceMotion = useReducedMotion();
  const position = useSpring(Math.max(0, index) * 100, glide);
  const velocity = useVelocity(position);
  const softness = useSpring(useTransform(velocity, speed => Math.min(Math.abs(speed) / 900, 1)), { stiffness: 280, damping: 30 });
  const x = useTransform(position, value => `${value}%`);
  const scaleX = useTransform(softness, value => 1 + value * 0.08);
  const scaleY = useTransform(softness, value => 1 - value * 0.035);
  const blur = useTransform(softness, value => value * 0.65);
  const filter = useMotionTemplate`blur(${blur}px)`;

  useEffect(() => {
    const target = Math.max(0, index) * 100;
    if (reduceMotion) {
      position.jump(target);
      softness.jump(0);
    } else {
      position.set(target);
    }
  }, [index, position, reduceMotion, softness]);

  return <motion.div data-liquid-indicator={variant}
    data-mobile-nav-indicator={variant === "navigation" ? "" : undefined}
    initial={false} animate={{ opacity: index < 0 ? 0 : 1 }}
    transition={{ duration: reduceMotion ? 0 : 0.18 }}
    className="relative h-full" style={{ width: `${100 / count}%`, x }}>
    <motion.div className={`mobile-liquid-pill mobile-liquid-pill-${variant}`}
      style={reduceMotion ? undefined : { scaleX, scaleY, filter }} />
  </motion.div>;
}
