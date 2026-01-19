export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const purpose = String(form.get("purpose") || "").trim();
  const token = String(form.get("cf-turnstile-response") || "").trim();

  if (!email || !purpose) {
    return new Response("Missing fields", { status: 400 });
  }

  if (!token) {
    return new Response("Turnstile token missing", { status: 400 });
  }

  const secret = env.TURNSTILE_SECRET;
  if (!secret) {
    return new Response("TURNSTILE_SECRET is not configured", { status: 500 });
  }

  // Verify Turnstile
  const verifyBody = new FormData();
  verifyBody.append("secret", secret);
  verifyBody.append("response", token);

  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) verifyBody.append("remoteip", ip);

  const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: verifyBody,
  });

  const verifyJson = (await verifyResp.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  if (!verifyJson.success) {
    return new Response(
      `Turnstile failed: ${(verifyJson["error-codes"] || []).join(", ")}`,
      { status: 403 }
    );
  }

  // TODO: send to Gmail/Slack/Notion (webhook). For MVP return OK.
  return new Response(JSON.stringify({ ok: true, email, purpose }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
