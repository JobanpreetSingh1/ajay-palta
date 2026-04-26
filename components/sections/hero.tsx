"use client";

import Link from "next/link";
import { GL } from "@/components/elements/gl";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div
      id="home"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-24 sm:px-6 sm:py-28 md:py-32"
    >
      <GL />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <h1 className="text-4xl leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl font-sentient">
          HOPE Cycle
          <br />
          <i className="font-light">Coolant Becomes</i> Power
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] text-balance font-mono text-sm leading-relaxed text-foreground/60 sm:mt-7 sm:text-base">
          HOPE Cycle recovers wasted heat from coolant and transforms it into clean, practical energy for smarter system performance.
        </p>

        <Link href="/calculator">
          <Button className="mt-10 w-full max-w-[240px] sm:mt-12 sm:w-auto">
            Try the Calculator
          </Button>
        </Link>
      </div>
    </div>
  );
}
