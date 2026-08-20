const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const cors = (response) => {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-headers", "content-type, authorization");
  response.headers.set("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
  return response;
};

async function api(request, env) {
  if (!env.DB) return json({ error: "Database not configured" }, 503);
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  if (url.pathname === "/api/health") return json({ ok: true, service: "noma-api" });
  if (url.pathname === "/api/products" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, name, category, price_cents, stock, image, tag, description FROM products WHERE active = 1 ORDER BY created_at DESC",
    ).all();
    return json(results);
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    const body = await request.json();
    if (!body.email || !Array.isArray(body.items) || !body.items.length) {
      return json({ error: "Email and items are required" }, 400);
    }
    const orderId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO orders (id, email, status, total_cents) VALUES (?, ?, 'pending', ?)",
    ).bind(orderId, body.email, Number(body.total_cents || 0)).run();
    return json({ id: orderId, status: "pending" }, 201);
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        return cors(await api(request, env));
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
