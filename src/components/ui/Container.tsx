import { cn } from "@/lib/cn";

export function Container({
  className,
  children,
  wide = false,
}: {
  className?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", wide ? "max-w-7xl" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}
