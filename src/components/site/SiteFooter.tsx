"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerNav, site } from "@/lib/content/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal")) return null;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-2/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              {site.tagline}. Riscul în lei, backup-ul demonstrat, intervențiile explicate. Construit pentru
              următorii 100 de ani.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-ink-2">
              <span className="live-dot" aria-hidden />
              <Link href="/status" className="hover:text-ink">
                Toate sistemele operaționale · status public
              </Link>
            </div>
            <div className="mt-5 space-y-1 text-sm text-ink-2">
              <p>
                <a href={`mailto:${site.email}`} className="hover:text-ink">
                  {site.email}
                </a>
              </p>
              <p>{site.address}</p>
              <p className="text-xs text-ink-3">
                {site.legalName} · {site.cui}
              </p>
            </div>
          </div>
          {footerNav.map((group) => (
            <div key={group.title}>
              <h3 className="eyebrow mb-4">{group.title}</h3>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-ink-2 hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.legalName}. Datele din demonstrații sunt fictive și marcate ca atare.</p>
          <p className="num">
            proiectat pentru 2026 → 2126 · fără lock-in · datele tale rămân ale tale
          </p>
        </div>
      </div>
    </footer>
  );
}
