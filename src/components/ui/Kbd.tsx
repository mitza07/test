export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="num inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-2 bg-surface-2 px-1 text-[10px] text-ink-2">
      {children}
    </kbd>
  );
}
