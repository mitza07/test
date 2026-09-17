import { Section, SectionHeading } from "@/components/ui/Section";

/** Secțiunea „Ce înseamnă rezultatul”: 3–4 explicații scurte, specifice instrumentului. */
export function ToolNotes({
  items,
  title = "Ce înseamnă rezultatul",
  lead,
}: {
  items: Array<{ title: string; body: React.ReactNode }>;
  title?: string;
  lead?: string;
}) {
  return (
    <Section tone="muted" className="no-print">
      <SectionHeading eyebrow="Interpretare" title={title} lead={lead} />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="text-base font-semibold text-ink">{it.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{it.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
