import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();
function env(name: string) { return (Deno.env.get(name) || "").trim(); }
function clean(value: unknown, max = 200) { return String(value || "").replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function reply(body: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }); }
async function sha256(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  const raw = await request.text();
  const timestamp = request.headers.get("x-paycore-timestamp") || "";
  const nonce = clean(request.headers.get("x-paycore-nonce"), 100);
  const signature = request.headers.get("x-paycore-signature") || "";
  if (env("PAYCORE_DELIVERY_SECRET").length < 32) return reply({ ok: false, code: "DELIVERY_SECRET_MISCONFIGURED" }, 503);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !nonce) return reply({ ok: false, code: "SIGNATURE_EXPIRED" }, 401);
  const expected = await hmacHex(env("PAYCORE_DELIVERY_SECRET"), `${timestamp}\n${nonce}\n${raw}`);
  if (!constantTimeEqual(expected, signature)) return reply({ ok: false, code: "SIGNATURE_INVALID" }, 401);
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: nonceError } = await admin.from("paycore_hotblood_nonces").insert({ nonce, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  if (nonceError) return reply({ ok: false, code: "NONCE_REPLAY" }, 409);
  try {
    const body = JSON.parse(raw || "{}");
    if (!body.eventId || !body.orderId || !body.accountId || !Array.isArray(body.rewards)) return reply({ ok: false, code: "DELIVERY_PAYLOAD_INVALID" }, 400);
    const payloadHash = await sha256(raw);
    const { data, error } = await admin.rpc("paycore_apply_hotblood_grant", {
      p_event_id: body.eventId, p_order_id: body.orderId, p_account_id: body.accountId,
      p_rewards: body.rewards, p_payload_hash: payloadHash
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    console.info(JSON.stringify({ orderId: body.orderId, eventId: body.eventId, status: row?.duplicate ? "duplicate" : "delivered" }));
    return reply({ ok: true, revision: Number(row?.revision) || 0, duplicate: Boolean(row?.duplicate) });
  } catch (caught) {
    const code = clean(caught instanceof Error ? caught.message : caught, 120) || "DELIVERY_FAILED";
    console.error(JSON.stringify({ status: "failed", code }));
    return reply({ ok: false, code }, 500);
  } finally {
    await admin.from("paycore_hotblood_nonces").delete().lt("expires_at", new Date().toISOString());
  }
});
