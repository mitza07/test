import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { buildKnowledge, localAnswer, search } from "@/lib/assistant/knowledge";
import { contextBlock, systemPrompt } from "@/lib/assistant/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20),
});

const recent = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  recent.set(ip, arr);
  return arr.length > 30;
}

let knowledge: ReturnType<typeof buildKnowledge> | null = null;
function docs() {
  return (knowledge ??= buildKnowledge());
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Prea multe mesaje. Încearcă din nou peste un minut." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Mesaj invalid." }, { status: 400 });

  const messages = parsed.data.messages;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "Ultimul mesaj trebuie să fie al utilizatorului." }, { status: 400 });

  const hits = search(last.content, docs(), 5).map((h) => h.doc);
  const sources = hits.slice(0, 3).map((d) => ({ title: d.title, url: d.url }));

  // Fără cheie: răspuns local, din baza de cunoștințe (fără model de limbaj).
  if (!process.env.ANTHROPIC_API_KEY) {
    const local = localAnswer(last.content, docs());
    return NextResponse.json({ mode: "local", text: local.text, sources: local.sources });
  }

  // Cu cheie: răspuns generat, ancorat strict în contextul extras din site, transmis în flux.
  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        send({ type: "sources", sources });
        const s = client.beta.messages.stream({
          model: "claude-opus-5",
          max_tokens: 1024,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [
            { type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } },
            { type: "text", text: `Context:\n\n${contextBlock(hits)}` },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") send({ type: "delta", text: event.delta.text });
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") send({ type: "delta", text: "Nu pot răspunde la această întrebare. Scrie-ne la /contact și răspundem într-o zi lucrătoare." });
        send({ type: "done" });
      } catch (err) {
        const local = localAnswer(last.content, docs());
        const reason = err instanceof Anthropic.APIError ? `API ${err.status}` : "eroare";
        console.error("[asistent]", reason, err);
        send({ type: "delta", text: local.text });
        send({ type: "done", fallback: true });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
