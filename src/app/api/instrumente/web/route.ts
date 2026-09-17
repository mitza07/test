import { z } from "zod";
import { checkWebsite } from "@/lib/tools/webCheck";
import { clientKey, errorJson, rateLimit, readJson, tooMany } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ url: z.string().trim().min(3).max(2048) });

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "web"), 10);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds, "verificări web");

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("Trimite adresa site-ului (între 3 și 2048 de caractere).", 400);

  try {
    const result = await checkWebsite(parsed.data.url);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verificarea a eșuat.";
    const invalid = message.startsWith("Adresă invalidă");
    return errorJson(message, invalid ? 400 : 502);
  }
}
