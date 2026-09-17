import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Numele e prea scurt").max(120),
  company: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email("Adresa de e-mail nu pare validă").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  subject: z.enum(["audit", "oferta", "apel", "intrebare", "contabili", "altceva"]).default("intrebare"),
  plan: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  website: z.string().max(0).optional().default(""), // honeypot
});

const recent = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  recent.set(ip, arr);
  return arr.length > 5;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Prea multe mesaje într-un minut. Încearcă din nou puțin mai târziu." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Date invalide." }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true }); // bot: răspundem ok, nu salvăm

  const record = { ...parsed.data, receivedAt: new Date().toISOString(), ip };
  delete (record as { website?: string }).website;

  // Salvare best-effort în .data/inbox.jsonl (ignorat de git). În producție se leagă la CRM / e-mail.
  try {
    const dir = path.join(process.cwd(), ".data");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, "inbox.jsonl"), JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error("[contact] nu am putut salva mesajul", err);
  }

  return NextResponse.json({ ok: true, ref: `MSG-${record.receivedAt.slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` });
}
