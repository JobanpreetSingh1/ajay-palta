"use client";

import Image from "next/image";

export function FutureSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden border-t border-foreground/[0.06] py-20 sm:py-24 md:py-28"
    >
      <div className="container relative">
        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[1.15fr_1fr]">
          <figure className="overflow-hidden rounded-2xl border border-foreground/[0.09] bg-black/45 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/[0.05]">
            <Image
              src="/images/ajaypalta.webp"
              alt="Abstract schematic: heat recovery and work output in the HOPE thermodynamic cycle"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
            <figcaption className="border-t border-foreground/[0.07] bg-black/50 px-5 py-3 font-mono text-[11px] text-foreground/45">
              Concept visualization of the HOPE thermodynamic cycle.
            </figcaption>
          </figure>

          <div className="rounded-2xl border border-foreground/[0.08] bg-gradient-to-br from-foreground/[0.03] via-black/30 to-primary/[0.04] p-6 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/[0.04] sm:p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
              What makes it different
            </p>
            <ul className="mt-5 space-y-4 font-mono text-sm leading-relaxed text-foreground/62">
              <li>Built around heat recovery from the coolant loop.</li>
              <li>Designed to integrate with existing engine ecosystems.</li>
              <li>Targets measurable efficiency gains with practical deployment paths.</li>
            </ul>

            <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/45">
              Vision
            </p>
            <p className="mt-3 text-pretty font-mono text-sm leading-relaxed text-foreground/60">
              Not replacement for the sake of replacement. HOPE extends what already
              works and unlocks new value from energy that is currently discarded.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
