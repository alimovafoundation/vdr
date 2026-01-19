export const onRequestPost = async ({ request, env }: any) => {
  try {
    let email = "";
    let purpose = "";
    let token = "";

    const ct = request.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      email = String(body.email || "").trim();
      purpose = String(body.purpose || "").trim();
      token = String(body.token || "").trim();
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "").trim();
      purpose = String(form.get("purpose") || "").trim();
      token =
        String(form.get("token") || "").trim() ||
        String(form.get("cf-turnstile-response") || "").trim();
    }

    if (!email || !purpose) return json({ error: "Missing email or purpose" }, 400);
    if (!token) return json({ error: "Missing Turnstile token" }, 400);
    if (!env.TURNSTILE_SECRET) return json({ error: "TURNSTILE_SECRET missing" }, 500);

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      (request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "");

    const params = new URLSearchParams();
    params.set("secret", env.TURNSTILE_SECRET);
    params.set("response", token);
    if (ip) params.set("remoteip", ip);

    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const verify = await verifyResp.json().catch(() => ({}));
    if (!verify?.success) return json({ error: "Turnstile verification failed", details: verify }, 403);

    // TODO: тут буде відправка заявки (email/webhook/queue)
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
