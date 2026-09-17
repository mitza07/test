"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";
const KEY = "nucleu-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  listeners.forEach((l) => l());
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  function cycle() {
    write(theme === "system" ? "dark" : theme === "dark" ? "light" : "system");
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorSmartphone;
  const label = theme === "dark" ? "Temă: întunecată" : theme === "light" ? "Temă: luminoasă" : "Temă: sistem";

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={cn("inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink", className)}
    >
      <Icon className="size-4" />
    </button>
  );
}
