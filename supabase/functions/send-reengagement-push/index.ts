// Deno Edge Function: send Web Push to inactive PWA subscribers.
// ADDITIVE — reads profiles.updated_at / push_subscriptions only; never writes profiles.
//
// JWT verification stays ENABLED: every caller sends the Supabase anon key as
// Authorization. The cron secret travels in the x-reengagement-secret header.
//
// Modes:
// 1) Cron / blast (default): header x-reengagement-secret: <REENGAGEMENT_CRON_SECRET>
//    body: { inactiveDays?, cooldownDays?, dryRun? }
// 2) Admin test: body: { mode: "admin_test", callerId, targetUserId?, title?, body?, url? }
//    Verifies callerId is admin in profiles (same pattern as other admin RPCs).
//    Does NOT require cron secret. Does NOT update last_pushed_at (won't skew cooldown).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
//          VAPID_SUBJECT (mailto:), REENGAGEMENT_CRON_SECRET (cron mode only)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, x-reengagement-secret",
};

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_pushed_at: string | null;
  profiles?: { updated_at: string; full_name: string | null } | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authorizeCron(req: Request): boolean {
  const secret = (Deno.env.get("REENGAGEMENT_CRON_SECRET") || "").trim();
  if (!secret) return false;
  const provided = (req.headers.get("x-reengagement-secret") || "").trim();
  if (provided.length !== secret.length) return false;

  // Constant-time compare so a wrong secret cannot be guessed byte by byte.
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) {
    diff |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

function monthLabelBn(d = new Date()) {
  const months = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ];
  return months[d.getMonth()] || "";
}

function getEnvOrThrow() {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  const vapidPublic = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
  const vapidPrivate = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
  const vapidSubject = (Deno.env.get("VAPID_SUBJECT") || "mailto:support@smartlineman.in").trim();

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return { error: "missing server secrets" as const };
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { supabase, vapidPublic, vapidPrivate };
}

async function sendToRows(
  supabase: ReturnType<typeof createClient>,
  rows: SubRow[],
  payload: Record<string, string>,
  options: { updateLastPushed: boolean },
) {
  const results = { sent: 0, failed: 0, removed: 0 };

  for (const row of rows) {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 60 * 60 * 24,
        urgency: "normal",
      });

      if (options.updateLastPushed) {
        await supabase
          .from("push_subscriptions")
          .update({ last_pushed_at: new Date().toISOString() })
          .eq("id", row.id);
      }

      results.sent += 1;
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
        results.removed += 1;
      } else {
        results.failed += 1;
        console.error("push failed", row.id, err);
      }
    }
  }

  return results;
}

async function handleAdminTest(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const callerId = typeof body.callerId === "string" ? body.callerId.trim() : "";
  if (!callerId) {
    return jsonResponse({ error: "callerId required" }, 400);
  }

  const { data: caller, error: callerErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", callerId)
    .maybeSingle();

  if (callerErr) {
    return jsonResponse({ error: callerErr.message }, 500);
  }

  if (!caller || String(caller.role || "").trim().toLowerCase() !== "admin") {
    return jsonResponse({ error: "not authorized" }, 403);
  }

  const targetUserId =
    (typeof body.targetUserId === "string" && body.targetUserId.trim()) ||
    callerId;

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, last_pushed_at")
    .eq("user_id", targetUserId)
    .limit(20);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  if (!rows || rows.length === 0) {
    return jsonResponse({
      ok: false,
      mode: "admin_test",
      error: "no_push_subscription",
      message:
        "Target user has no saved Web Push subscription. Open the PWA, allow notifications, then retry.",
      targetUserId,
      candidates: 0,
      sent: 0,
    });
  }

  const title =
    (typeof body.title === "string" && body.title.trim()) ||
    "SmartLineman (admin test)";
  const message =
    (typeof body.body === "string" && body.body.trim()) ||
    "Test push OK — যদি এটি দেখেন, রি-এনগেজমেন্ট কাজ করছে।";
  const url = (typeof body.url === "string" && body.url.trim()) || "/";

  const payload = {
    title,
    body: message,
    url,
    tag: "slm-admin-test",
  };

  const sendResults = await sendToRows(supabase, rows as SubRow[], payload, {
    updateLastPushed: false,
  });

  return jsonResponse({
    ok: true,
    mode: "admin_test",
    targetUserId,
    candidates: rows.length,
    ...sendResults,
  });
}

async function handleInactiveBlast(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  let inactiveDays = 7;
  let cooldownDays = 7;
  let dryRun = false;

  if (Number.isFinite(Number(body.inactiveDays))) {
    inactiveDays = Math.max(1, Math.min(60, Number(body.inactiveDays)));
  }
  if (Number.isFinite(Number(body.cooldownDays))) {
    cooldownDays = Math.max(1, Math.min(60, Number(body.cooldownDays)));
  }
  dryRun = Boolean(body.dryRun);

  const inactiveCutoffMs = Date.now() - inactiveDays * 86400000;
  const cooldownCutoffMs = Date.now() - cooldownDays * 86400000;

  const { data: rawRows, error } = await supabase
    .from("push_subscriptions")
    .select(
      "id, user_id, endpoint, p256dh, auth, last_pushed_at, profiles!inner(updated_at, full_name)",
    )
    .limit(2000);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const rows = ((rawRows || []) as SubRow[]).filter((row) => {
    const updatedAt = row.profiles?.updated_at
      ? Date.parse(row.profiles.updated_at)
      : NaN;
    if (!Number.isFinite(updatedAt) || updatedAt > inactiveCutoffMs) return false;
    if (!row.last_pushed_at) return true;
    const lastPush = Date.parse(row.last_pushed_at);
    return !Number.isFinite(lastPush) || lastPush < cooldownCutoffMs;
  });

  const monthBn = monthLabelBn();
  const payload = {
    title: "SmartLineman",
    body: `${monthBn} মাসের পুরস্কার মিস করবেন না — আজই খেলুন!`,
    url: "/",
    tag: "slm-reengagement",
  };

  const results = {
    candidates: rows.length,
    sent: 0,
    failed: 0,
    removed: 0,
    dryRun,
    inactiveDays,
    cooldownDays,
  };

  if (rows.length === 0 || dryRun) {
    return jsonResponse({ ok: true, mode: "inactive_blast", ...results });
  }

  const sendResults = await sendToRows(supabase, rows, payload, {
    updateLastPushed: true,
  });

  return jsonResponse({
    ok: true,
    mode: "inactive_blast",
    ...results,
    ...sendResults,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST only" }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const env = getEnvOrThrow();
  if ("error" in env) {
    return jsonResponse({ error: env.error }, 500);
  }

  const mode = typeof body.mode === "string" ? body.mode.trim() : "";

  if (mode === "admin_test") {
    return handleAdminTest(env.supabase, body);
  }

  if (!authorizeCron(req)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  return handleInactiveBlast(env.supabase, body);
});
