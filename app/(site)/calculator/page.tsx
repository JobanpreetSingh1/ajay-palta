import type { Metadata } from "next";

import HopeCalc from "@/components/calc/hope-calc";
import { Pill } from "@/components/elements/pill";

export const metadata: Metadata = {
  title: "Calculator",
  description:
    "HOPE cycle efficiency calculator — model operating points, metrics, and energy flow.",
};

export default function CalculatorPage() {
  return (
    <main className="min-h-svh px-4 pb-20 pt-32 md:pb-24 md:pt-40">
      <div className="container">
        <header className="mx-auto max-w-3xl border-b border-foreground/[0.08] py-20 text-center md:py-24">
          <Pill className="mb-6">CALCULATOR</Pill>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary/90 sm:text-sm">
            HOPE Hybrid Cycle Explorer
          </p>
          
          <h1 className="mt-5 font-sentient text-3xl leading-[1.12] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Model your operating point
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-foreground/55 sm:text-base md:mt-7">
            Configure inputs, compare up to five scenarios, and export charts, CSV, or PDF
            reports — aligned with the reference thermodynamic model.
          </p>
        </header>
      </div>

      <div className="container mt-10 max-w-[1600px] md:mt-12 ">
        <HopeCalc />
      </div>
    </main>
  );
}
