import { z } from "zod";
import { checkEmailDomain } from "@/lib/tools/emailCheck";
import { clientKey, errorJson, rateLimit, readJson, tooMany } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ domain: z.string().trim().min(3).max(253) });

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "email"), 20);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds, "verificări de e-mail");

  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("Trimite un domeniu sau o adresă de e-mail (între 3 și 253 de caractere).", 400);

  try {
    const result = await checkEmailDomain(parsed.data.domain);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verificarea a eșuat.";
    const invalid = message.startsWith("Domeniu invalid");
    return errorJson(invalid ? message : `Nu am putut interoga DNS-ul pentru acest domeniu. ${message}`, invalid ? 400 : 502);
  }
}
