"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Expand, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Pill } from "@/components/elements/pill";

const revolutionMilestones = [
  {
    title: "Newcomen",
    year: "1712",
    efficiency: "≈ 1%",
    insight: "Power from vacuum, marking the first practical atmospheric engine era.",
    image: "/revolution/01-newcomen-1712.png",
  },
  {
    title: "Watt",
    year: "1769",
    efficiency: "≈ 2-3%",
    insight: "Separate condenser architecture reduced heat loss and improved repeatability.",
    image: "/revolution/02-watt-1769.png",
  },
  {
    title: "Trevithick",
    year: "1801",
    efficiency: "≈ 10%",
    insight: "High-pressure steam unlocked compact power systems and broader industrial use.",
    image: "/revolution/03-trevithick-1801.png",
  },
  {
    title: "Lenoir",
    year: "1860",
    efficiency: "≈ 4%",
    insight: "Combustion moved inside the cylinder and reshaped engine possibilities.",
    image: "/revolution/04-lenoir-1860.png",
  },
  {
    title: "Otto",
    year: "1876",
    efficiency: "≈ 15-20%",
    insight: "The four-stroke compression cycle established a modern operating blueprint.",
    image: "/revolution/05-otto-1876.png",
  },
  {
    title: "Atkinson",
    year: "1882",
    efficiency: "≈ 25-30%",
    insight: "Over-expansion extracted more useful work from the same heat input.",
    image: "/revolution/07-atkinson-1882.png",
  },
  {
    title: "Diesel",
    year: "1897",
    efficiency: "≈ 20-25%",
    insight: "Compression ignition delivered robust torque and production-grade efficiency.",
    image: "/revolution/06-diesel-1897.png",
  },
] as const;

export function RevolutionSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const activeItem = activeIndex === null ? null : revolutionMilestones[activeIndex];

  return (
    <section
      id="revolution"
      className="border-t border-foreground/[0.06] py-20 sm:py-24 md:py-28"
    >
      <div className="container  text-center">
        <header className="max-w-2xl mx-auto">
          <Pill>REVOLUTION OF ENGINE</Pill>
          <h2 className="mt-6 text-balance font-sentient text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            A simple timeline of engine evolution.
          </h2>
          <p className="mt-5 max-w-2xl font-mono text-sm leading-relaxed text-foreground/60 sm:text-base">
            Seven milestones from 1712 to 1897. Clean layout, clear references,
            and full-size illustrations on click.
          </p>
        </header>

        <div className="mt-12 grid gap-6 sm:mt-14 md:grid-cols-2">
          {revolutionMilestones.map((item, index) => (
            <motion.article
              key={`${item.title}-${item.year}`}
              className="group overflow-hidden rounded-2xl border border-foreground/[0.08] bg-background/40"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 0.3, delay: index * 0.02, ease: "easeOut" }
              }
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="relative block w-full cursor-zoom-in overflow-hidden text-left"
                aria-label={`Open ${item.title} ${item.year} image`}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.image}
                    alt={`${item.title} engine illustration`}
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.01]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/80">
                    <Expand className="size-3" />
                    Open
                  </div>
                </div>
              </button>

              <div className="space-y-3 border-t border-foreground/[0.08] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em] text-foreground/55">
                  <span>{item.year}</span>
                  <span>{item.efficiency}</span>
                </div>
                <h3 className="font-sentient text-2xl text-foreground">{item.title}</h3>
                <p className="font-mono text-sm leading-relaxed text-foreground/62">
                  {item.insight}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <Dialog.Root
        open={activeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null);
        }}
      >
        <AnimatePresence>
          {activeItem ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay forceMount asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  transition={
                    prefersReducedMotion ? undefined : { duration: 0.25, ease: "easeOut" }
                  }
                />
              </Dialog.Overlay>
              <Dialog.Content forceMount asChild>
                <motion.div
                  className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-black/90 p-3 shadow-[0_36px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-md sm:p-4"
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97, y: 14 }}
                  transition={
                    prefersReducedMotion ? undefined : { duration: 0.3, ease: "easeOut" }
                  }
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 px-1">
                      <Dialog.Title className="font-sentient text-2xl text-foreground sm:text-3xl">
                        {activeItem.title}
                        <span className="ml-2 text-foreground/60">— {activeItem.year}</span>
                      </Dialog.Title>
                      <Dialog.Close className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-foreground/80 transition-colors hover:text-foreground">
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                      </Dialog.Close>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80">
                      <Image
                        src={activeItem.image}
                        alt={`${activeItem.title} engine illustration`}
                        width={1024}
                        height={682}
                        className="h-auto max-h-[72vh] w-full object-contain"
                      />
                    </div>

                    <p className="px-1 font-mono text-sm leading-relaxed text-foreground/65">
                      {activeItem.insight} Efficiency {activeItem.efficiency}.
                    </p>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </section>
  );
}
