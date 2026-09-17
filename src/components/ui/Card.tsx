import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  as: Tag = "div",
  padded = true,
  interactive = false,
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "article" | "section" | "li";
  padded?: boolean;
  interactive?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl bg-surface hairline shadow-card",
        padded && "p-6",
        interactive && "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
