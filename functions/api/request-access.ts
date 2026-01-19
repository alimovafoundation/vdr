export const onRequestPost: PagesFunction<{
  TURNSTILE_SECRET: string;
}> = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({}));

    const email = String(body.email || "").trim();
    const purpose = String(body.purpose || "").trim();
    const token = String(body.token || "").trim();

    if (!email || !purpose) {
      return json({ error: "Missing email or purpose" }, 400);
    }
    if (!token) {
      return json({ error: "Missing Turnstile token" }, 400);
    }
    if (!env.TURNSTILE_SECRET) {
      return json({ error: "Server misconfigured: TURNSTILE_SECRET missing" }, 500);
    }

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "";

    const formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET);
    formData.append("response", token);
    if (ip) formData.append("remoteip", ip);

    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const verify = await verifyResp.json().catch(() => ({}));

    if (!verify?.success) {
      return json({ error: "Turnstile verification failed", details: verify }, 403);
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
