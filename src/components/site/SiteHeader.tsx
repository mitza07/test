"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { nav } from "@/lib/content/site";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // Navigarea închide meniul mobil (stare derivată din rută, calculată în timpul randării).
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const inPortal = pathname?.startsWith("/portal");
  if (inPortal) return null;

  return (
    <header className="sticky top-0 z-50 glass border-b border-line">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Nucleu — acasă">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  item.href === "/manifest" && "text-accent-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="hidden md:block">
            <Button href="/portal" variant="secondary" size="sm">
              Portal client
            </Button>
          </div>
          <div className="hidden sm:block">
            <Button href="/instrumente/audit-it" size="sm">
              Audit IT gratuit <ArrowRight className="size-4" />
            </Button>
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2 lg:hidden"
            aria-expanded={open}
            aria-controls="meniu-mobil"
            aria-label={open ? "Închide meniul" : "Deschide meniul"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="meniu-mobil" className="lg:hidden border-t border-line bg-bg">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6" aria-label="Mobil">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/portal" className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-2">
              Portal client
            </Link>
            <Link href="/contact" className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-2">
              Contact
            </Link>
            <div className="mt-3 flex items-center gap-3 px-3">
              <Button href="/instrumente/audit-it" className="flex-1">
                Audit IT gratuit
              </Button>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
