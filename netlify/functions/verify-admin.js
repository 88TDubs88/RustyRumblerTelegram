export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const submittedCode = String(body.code || "");
    const realCode = process.env.RUSTY_ADMIN_CODE;

    if (!realCode) {
      return new Response(JSON.stringify({ ok: false, error: "Admin code not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: submittedCode === realCode }), {
      status: submittedCode === realCode ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
