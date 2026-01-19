export async function onRequestPost(context: any) {
  const { request, env } = context;

  const form = await request.formData();

  const email = String(form.get("email") || "").trim();
  const purpose = String(form.get("purpose") || "").trim();

  // Turnstile стандартне поле:
  const token =
    String(form.get("cf-turnstile-response") || "").trim() ||
    String(form.get("token") || "").trim(); // fallback

  if (!email || !purpose) {
    return new Response("Missing fields", { status: 400 });
  }

  if (!token) {
    return new Response("Turnstile token missing", { status: 400 });
  }

  if (!env.TURNSTILE_SECRET) {
    return new Response("TURNSTILE_SECRET missing", { status: 500 });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: ip,
    }),
  });

  const data = await verifyRes.json().catch(() => null);

  if (!data || data.success !== true) {
    return new Response(`Turnstile verification failed: ${JSON.stringify(data)}`, { status: 403 });
  }

  // MVP: просто 200 OK (далі підв’яжемо Gmail/Slack/Notion)
  return new Response("OK", { status: 200 });
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}
