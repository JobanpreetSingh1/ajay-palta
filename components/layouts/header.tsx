import Link from "next/link";

import { MobileMenu } from "@/components/elements/mobile-menu";

export const Header = () => {
  return (
    <div className=" absolute z-50 pt-8 md:pt-14 top-0 left-0 w-full">
      <header className="flex items-center justify-between container">
        <Link href="/">
          {/* <Logo className="w-[100px] md:w-[120px]" /> */}
          <h1 className="text-3xl font-bold uppercase">Ajay Palta</h1>
        </Link>
        <nav className="flex max-lg:hidden items-center justify-end gap-x-14">
          {(
            [
              { label: "Home", href: "/" },
              { label: "Calculator", href: "/calculator" },
            ] as const
          ).map((item) => (
            <Link
              key={item.href}
              className="uppercase inline-block font-mono text-foreground/60 hover:text-foreground/100 duration-150 transition-colors ease-out"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>
    </div>
  );
};
