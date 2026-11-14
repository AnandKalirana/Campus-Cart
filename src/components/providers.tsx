"use client";
import { MotionConfig } from "framer-motion";

/** Honour the OS "reduce motion" setting for every framer-motion animation in the app. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
