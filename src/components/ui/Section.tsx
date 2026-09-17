import { cn } from "@/lib/cn";
import { Container } from "./Container";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <Tag
        className={cn(
          "font-semibold tracking-tight text-ink",
          Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl leading-[1.05]" : "text-3xl sm:text-4xl leading-[1.1]",
        )}
      >
        {title}
      </Tag>
      {lead && <p className="mt-5 text-lg leading-relaxed text-ink-2">{lead}</p>}
    </div>
  );
}

export function Section({
  id,
  className,
  children,
  tone = "default",
  wide,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "muted" | "ink";
  wide?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        tone === "muted" && "bg-surface-2/60",
        tone === "ink" && "bg-ink text-bg",
        className,
      )}
    >
      <Container wide={wide}>{children}</Container>
    </section>
  );
}
