export const onRequestGet: PagesFunction = async () => {
  return json(
    { ok: false, error: "Method Not Allowed. Use POST." },
    405,
    { Allow: "POST" }
  );
};

export const onRequestPost: PagesFunction<{
  TURNSTILE_SECRET: string;
}> = async ({ request, env }) => {
  try {
    const ct = request.headers.get("content-type") || "";
    let data: Record<string, any> = {};

    if (ct.includes("application/json")) {
      data = await request.json().catch(() => ({}));
    } else if (
      ct.includes("multipart/form-data") ||
      ct.includes("application/x-www-form-urlencoded")
    ) {
      const fd = await request.formData();
      data = Object.fromEntries(fd.entries());
    } else {
      // fallback: try JSON anyway
      data = await request.json().catch(() => ({}));
    }

    const email = String(data.email || "").trim();
    const purpose = String(data.purpose || "").trim();

    const token = String(
      data.token ||
        data["cf-turnstile-response"] ||
        data["turnstileToken"] ||
        ""
    ).trim();

    if (!email || !purpose) return json({ error: "Missing email or purpose" }, 400);
    if (!token) return json({ error: "Missing Turnstile token" }, 400);
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

    const verifyResp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData }
    );

    const verify = await verifyResp.json().catch(() => ({}));

    if (!verify?.success) {
      return json({ error: "Turnstile verification failed", details: verify }, 403);
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
};

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}
