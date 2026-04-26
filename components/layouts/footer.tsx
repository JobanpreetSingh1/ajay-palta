import Link from "next/link";

const links = [
  { label: "Home", href: "/#home" },
  { label: "Calculator", href: "/calculator" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.07] bg-black">
      <div className="container py-8 md:py-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
            <Link
              href="/"
              className="shrink-0 font-sentient text-lg tracking-tight text-foreground md:text-xl"
            >
              Ajay Palta
            </Link>
            <span className="font-mono text-[11px] text-foreground/40 md:text-xs">
              HOPE Cycle
            </span>
          </div>

          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/50 md:text-xs md:tracking-[0.12em]"
            aria-label="Footer"
          >
            {links.map((item, i) => (
              <span key={item.href} className="inline-flex items-center gap-x-4">
                {i > 0 ? (
                  <span className="text-foreground/25" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  className="transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>

        <p className="mt-6 border-t border-foreground/[0.06] pt-5 font-mono text-[10px] text-foreground/35 md:text-[11px]">
          © {new Date().getFullYear()} Ajay Palta · HOPE Cycle research
        </p>
      </div>
    </footer>
  );
}
