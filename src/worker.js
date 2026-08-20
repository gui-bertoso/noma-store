const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const cors = (r, env) => { r.headers.set("access-control-allow-origin", new URL(env.PUBLIC_SITE_URL).origin); r.headers.set("access-control-allow-headers", "content-type"); r.headers.set("access-control-allow-methods", "GET, POST, OPTIONS"); r.headers.set("vary", "Origin"); return r; };
const adminToken = (request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
const requireAdmin = (request, env) => Boolean(env.ADMIN_TOKEN && adminToken(request) === env.ADMIN_TOKEN);
const adminError = () => json({ error: "Admin authentication required" }, 401);

async function createStripeSession(env, orderId, email, items) {
  const params = new URLSearchParams({ mode: "payment", customer_email: email, client_reference_id: orderId, success_url: `${env.PUBLIC_SITE_URL}/checkout.html?success=1&order=${orderId}`, cancel_url: `${env.PUBLIC_SITE_URL}/checkout.html?cancelled=1`, "shipping_address_collection[allowed_countries][0]": "BR" });
  items.forEach((item, i) => {
    params.set(`line_items[${i}][price_data][currency]`, "brl");
    params.set(`line_items[${i}][price_data][product_data][name]`, item.name);
    params.set(`line_items[${i}][price_data][unit_amount]`, String(item.price_cents));
    params.set(`line_items[${i}][quantity]`, String(item.quantity));
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: params });
  return response.ok ? response.json() : null;
}

async function api(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!env.DB) return json({ error: "Database not configured" }, 503);
  const path = new URL(request.url).pathname;
  if (path === "/api/health") return json({ ok: true, service: "noma-api" });
  if (path === "/api/products" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, name, category, price_cents, stock, image, tag, description FROM products WHERE active = 1 ORDER BY created_at DESC").all();
    return json(results);
  }
  if (path.startsWith("/api/admin/")) {
    if (!requireAdmin(request, env)) return adminError();
    if (path === "/api/admin/settings" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT key, value FROM store_settings ORDER BY key").all();
      return json(Object.fromEntries(results.map((row) => [row.key, row.value])));
    }
    if (path === "/api/admin/settings" && request.method === "PUT") {
      const body = await request.json();
      const allowed = ["store_name", "margin_percent", "shipping_cents", "free_shipping_threshold_cents", "promo_text"];
      const writes = allowed.filter((key) => body[key] !== undefined).map((key) => env.DB.prepare("INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, String(body[key])));
      if (writes.length) await env.DB.batch(writes);
      return json({ ok: true });
    }
    if (path === "/api/admin/orders" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT id, email, status, total_cents, payment_id, created_at FROM orders ORDER BY created_at DESC LIMIT 100").all();
      return json(results);
    }
    if (path === "/api/admin/products" && request.method === "POST") {
      const body = await request.json();
      if (!body.name || !body.category || !Number.isFinite(Number(body.price_cents))) return json({ error: "Name, category and price are required" }, 400);
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO products (id, tenant_id, name, category, price_cents, stock, image, tag, description) VALUES (?, 'noma', ?, ?, ?, ?, ?, ?, ?)").bind(id, body.name, body.category, Math.round(Number(body.price_cents)), Math.max(0, Math.floor(Number(body.stock || 0))), body.image || null, body.tag || null, body.description || null).run();
      return json({ id }, 201);
    }
    const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (productMatch && request.method === "PATCH") {
      const body = await request.json();
      await env.DB.prepare("UPDATE products SET name = COALESCE(?, name), category = COALESCE(?, category), price_cents = COALESCE(?, price_cents), stock = COALESCE(?, stock), image = COALESCE(?, image), tag = ?, description = COALESCE(?, description), active = COALESCE(?, active) WHERE id = ?").bind(body.name ?? null, body.category ?? null, body.price_cents == null ? null : Math.round(Number(body.price_cents)), body.stock == null ? null : Math.max(0, Math.floor(Number(body.stock))), body.image ?? null, body.tag ?? null, body.description ?? null, body.active == null ? null : (body.active ? 1 : 0), productMatch[1]).run();
      return json({ ok: true });
    }
    if (productMatch && request.method === "DELETE") {
      await env.DB.prepare("UPDATE products SET active = 0 WHERE id = ?").bind(productMatch[1]).run();
      return json({ ok: true });
    }
    return json({ error: "Admin route not found" }, 404);
  }
  if (path === "/api/checkout" && request.method === "POST") {
    if (!env.STRIPE_SECRET_KEY || !env.PUBLIC_SITE_URL) return json({ error: "Checkout not configured" }, 503);
    const body = await request.json();
    if (!/^\S+@\S+\.\S+$/.test(body.email || "") || !Array.isArray(body.items) || !body.items.length) return json({ error: "Email and items are required" }, 400);
    const items = [];
    for (const input of body.items) {
      const quantity = Number(input.quantity);
      const product = await env.DB.prepare("SELECT id, name, price_cents, stock FROM products WHERE id = ? AND active = 1").bind(String(input.id)).first();
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !product || product.stock < quantity) return json({ error: "Produto indisponível ou quantidade inválida" }, 409);
      items.push({ ...product, quantity });
    }
    const orderId = crypto.randomUUID();
    const productTotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    const shipping = productTotal >= 29900 ? 0 : 2490;
    const total = productTotal + shipping;
    await env.DB.batch([env.DB.prepare("INSERT INTO orders (id, tenant_id, email, status, total_cents) VALUES (?, 'noma', ?, 'pending', ?)").bind(orderId, body.email, total), ...items.map((item) => env.DB.prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)").bind(orderId, item.id, item.quantity, item.price_cents))]);
    if (shipping) items.push({ name: "Frete", price_cents: shipping, quantity: 1 });
    const session = await createStripeSession(env, orderId, body.email, items);
    if (!session?.url) return json({ error: "Não foi possível iniciar o pagamento" }, 502);
    await env.DB.prepare("UPDATE orders SET payment_id = ? WHERE id = ?").bind(session.id, orderId).run();
    return json({ url: session.url });
  }
  return json({ error: "Not found" }, 404);
}

async function webhook(request, env) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  const timestamp = signature.match(/t=(\d+)/)?.[1];
  const received = signature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!timestamp || !received || !env.STRIPE_WEBHOOK_SECRET || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return new Response("Invalid signature", { status: 400 });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected !== received) return new Response("Invalid signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const orderId = event.data.object.client_reference_id;
    const order = await env.DB.prepare("SELECT status FROM orders WHERE id = ?").bind(orderId).first();
    if (order?.status === "pending") {
      const { results } = await env.DB.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").bind(orderId).all();
      await env.DB.batch([...results.map((item) => env.DB.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?").bind(item.quantity, item.product_id, item.quantity)), env.DB.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").bind(orderId)]);
    }
  }
  return new Response("ok");
}

export default { async fetch(request, env) { try { const path = new URL(request.url).pathname; if (path === "/api/webhooks/stripe" && request.method === "POST") return webhook(request, env); if (path.startsWith("/api/")) return cors(await api(request, env), env); return env.ASSETS.fetch(request); } catch (error) { console.error(error); return json({ error: "Internal server error" }, 500); } } };
