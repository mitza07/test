import { clientKey, errorJson, rateLimit, tooMany } from "../_lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_BYTES = 100_000;
const MAX_BYTES = 20_000_000;
const CHUNK = 65_536; // limita unui apel crypto.getRandomValues

/* Un bloc aleator generat o singură dată per proces, repetat până la lungimea cerută. */
let chunk: Uint8Array | null = null;
function randomChunk(): Uint8Array {
  if (!chunk) {
    chunk = new Uint8Array(CHUNK);
    crypto.getRandomValues(chunk);
  }
  return chunk;
}

function payload(bytes: number): Uint8Array<ArrayBuffer> {
  const src = randomChunk();
  const out = new Uint8Array(new ArrayBuffer(bytes));
  for (let off = 0; off < bytes; off += CHUNK) out.set(src.subarray(0, Math.min(CHUNK, bytes - off)), off);
  return out;
}

const noStore = {
  "cache-control": "no-store, no-transform",
  pragma: "no-cache",
};

/** GET ?bytes=N → N octeți pseudo-aleatori, necomprimabili, pentru măsurarea descărcării. */
export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "viteza-get"), 60);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds, "cereri de test");
  const raw = Number(new URL(req.url).searchParams.get("bytes") ?? MIN_BYTES);
  const bytes = Number.isFinite(raw) ? Math.min(MAX_BYTES, Math.max(MIN_BYTES, Math.floor(raw))) : MIN_BYTES;
  const body = payload(bytes);
  return new Response(body, {
    headers: {
      ...noStore,
      "content-type": "application/octet-stream",
      "content-length": String(body.byteLength),
    },
  });
}

/** POST <octeți> → { received } pentru măsurarea încărcării. Corpul e citit integral și aruncat. */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "viteza-post"), 30);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds, "cereri de test");
  try {
    const buf = await req.arrayBuffer();
    return Response.json({ received: buf.byteLength }, { headers: noStore });
  } catch {
    return errorJson("Nu am putut citi datele trimise.", 400);
  }
}

/** HEAD → doar antete, fără corp: folosit pentru latență. */
export async function HEAD(req: Request) {
  const rl = rateLimit(clientKey(req, "viteza-head"), 120);
  if (!rl.ok) return new Response(null, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds), ...noStore } });
  return new Response(null, { status: 200, headers: { ...noStore, "content-type": "application/octet-stream" } });
}
