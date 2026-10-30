const security = (response) => { response.headers.set("x-content-type-options", "nosniff"); response.headers.set("x-frame-options", "DENY"); response.headers.set("referrer-policy", "strict-origin-when-cross-origin"); response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()"); response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains"); response.headers.set("content-security-policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'"); return response; };
const json = (data, status = 200) => security(new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }));
const cors = (r, env) => { r.headers.set("access-control-allow-origin", new URL(env.PUBLIC_SITE_URL).origin); r.headers.set("access-control-allow-headers", "content-type, authorization, idempotency-key"); r.headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"); r.headers.set("vary", "Origin"); return r; };
const adminToken = (request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
const requireAdmin = async (request, env) => { if (!env.ADMIN_TOKEN) return false; const encoder = new TextEncoder(); const [provided, expected] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(adminToken(request))), crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_TOKEN))]); const a = new Uint8Array(provided), b = new Uint8Array(expected); let difference = a.length ^ b.length; for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i]; return difference === 0; };
const adminError = () => json({ error: "Admin authentication required" }, 401);
const sameText = (left, right) => { const a = new TextEncoder().encode(left); const b = new TextEncoder().encode(right); let difference = a.length ^ b.length; for (let i = 0; i < a.length; i++) difference |= a[i] ^ (b[i] || 0); return difference === 0; };

async function createStripeSession(env, orderId, email, items, idempotencyKey) {
  const params = new URLSearchParams({ mode: "payment", customer_email: email, client_reference_id: orderId, success_url: `${env.PUBLIC_SITE_URL}/checkout.html?success=1&order=${orderId}`, cancel_url: `${env.PUBLIC_SITE_URL}/checkout.html?cancelled=1`, "shipping_address_collection[allowed_countries][0]": "BR" });
  items.forEach((item, i) => {
    params.set(`line_items[${i}][price_data][currency]`, "brl");
    params.set(`line_items[${i}][price_data][product_data][name]`, item.name);
    params.set(`line_items[${i}][price_data][unit_amount]`, String(item.price_cents));
    params.set(`line_items[${i}][quantity]`, String(item.quantity));
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded", "idempotency-key": idempotencyKey }, body: params });
  return response.ok ? response.json() : null;
}

async function api(request, env) {
  if (request.method === "OPTIONS") return security(new Response(null, { status: 204 }));
  if (!env.DB) return json({ error: "Database not configured" }, 503);
  const path = new URL(request.url).pathname;
  if (path === "/api/health") return json({ ok: true, service: "noma-api" });
  if (path === "/api/products" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, name, category, price_cents, stock, image, tag, description FROM products WHERE active = 1 ORDER BY created_at DESC").all();
    return json(results);
  }
  if (path.startsWith("/api/admin/")) {
    if (!await requireAdmin(request, env)) return adminError();
    if (path === "/api/admin/settings" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT key, value FROM store_settings ORDER BY key").all();
      return json(Object.fromEntries(results.map((row) => [row.key, row.value])));
    }
    if (path === "/api/admin/settings" && request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON" }, 400);
      const allowed = ["store_name", "margin_percent", "shipping_cents", "free_shipping_threshold_cents", "promo_text"];
      if (body.store_name !== undefined && (typeof body.store_name !== "string" || body.store_name.length > 120)) return json({ error: "Invalid store name" }, 400);
      if (body.promo_text !== undefined && (typeof body.promo_text !== "string" || body.promo_text.length > 240)) return json({ error: "Invalid promo text" }, 400);
      for (const key of ["margin_percent", "shipping_cents", "free_shipping_threshold_cents"]) if (body[key] !== undefined && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0 || Number(body[key]) > 100000000)) return json({ error: "Invalid numeric setting" }, 400);
      const writes = allowed.filter((key) => body[key] !== undefined).map((key) => env.DB.prepare("INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, String(body[key])));
      if (writes.length) await env.DB.batch(writes);
      return json({ ok: true });
    }
    if (path === "/api/admin/orders" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT id, email, status, total_cents, payment_id, created_at FROM orders ORDER BY created_at DESC LIMIT 100").all();
      return json(results);
    }
    if (path === "/api/admin/products" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || typeof body.name !== "string" || typeof body.category !== "string" || body.name.length < 1 || body.name.length > 160 || body.category.length > 80 || !Number.isFinite(Number(body.price_cents)) || Number(body.price_cents) < 0 || Number(body.price_cents) > 100000000 || !Number.isFinite(Number(body.stock || 0)) || Number(body.stock || 0) < 0 || !Number.isInteger(Number(body.stock || 0))) return json({ error: "Invalid product data" }, 400);
      if (body.image && (!/^https:\/\//i.test(body.image) || body.image.length > 2000)) return json({ error: "Image must use HTTPS" }, 400);
      if (body.description && String(body.description).length > 2000) return json({ error: "Description is too long" }, 400);
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO products (id, tenant_id, name, category, price_cents, stock, image, tag, description) VALUES (?, 'noma', ?, ?, ?, ?, ?, ?, ?)").bind(id, body.name, body.category, Math.round(Number(body.price_cents)), Math.max(0, Math.floor(Number(body.stock || 0))), body.image || null, body.tag || null, body.description || null).run();
      return json({ id }, 201);
    }
    const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (productMatch && request.method === "PATCH") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON" }, 400);
      if (body.name !== undefined && (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 160)) return json({ error: "Invalid name" }, 400);
      if (body.category !== undefined && (typeof body.category !== "string" || body.category.length > 80)) return json({ error: "Invalid category" }, 400);
      if (body.price_cents !== undefined && (!Number.isFinite(Number(body.price_cents)) || Number(body.price_cents) < 0 || Number(body.price_cents) > 100000000)) return json({ error: "Invalid price" }, 400);
      if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) return json({ error: "Invalid stock" }, 400);
      if (body.image !== undefined && body.image !== null && (!/^https:\/\//i.test(body.image) || body.image.length > 2000)) return json({ error: "Image must use HTTPS" }, 400);
      if (body.description !== undefined && body.description !== null && String(body.description).length > 2000) return json({ error: "Description is too long" }, 400);
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
    const idempotencyKey = request.headers.get("idempotency-key") || "";
    if (!/^[A-Za-z0-9_-]{16,255}$/.test(idempotencyKey)) return json({ error: "Idempotency-Key is required" }, 400);
    if (Number(request.headers.get("content-length") || 0) > 100000) return json({ error: "Request too large" }, 413);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !/^\S+@\S+\.\S+$/.test(body.email || "") || body.email.length > 254 || !Array.isArray(body.items) || !body.items.length || body.items.length > 50) return json({ error: "Invalid email or items" }, 400);
    const existing = await env.DB.prepare("SELECT id, payment_id FROM orders WHERE idempotency_key = ?").bind(idempotencyKey).first();
    if (existing) return json({ error: existing.payment_id ? "Checkout already created" : "Checkout is already being created", order_id: existing.id, payment_id: existing.payment_id || null }, 409);
    const items = [];
    const seen = new Set();
    for (const input of body.items) {
      if (seen.has(String(input.id))) return json({ error: "Duplicate product" }, 400);
      seen.add(String(input.id));
      const quantity = Number(input.quantity);
      const product = await env.DB.prepare("SELECT id, name, price_cents, stock FROM products WHERE id = ? AND active = 1").bind(String(input.id)).first();
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !product || product.stock < quantity) return json({ error: "Product unavailable or invalid quantity" }, 409);
      items.push({ ...product, quantity });
    }
    const orderId = crypto.randomUUID();
    const productTotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    const shipping = productTotal >= 29900 ? 0 : 2490;
    const total = productTotal + shipping;
    await env.DB.batch([env.DB.prepare("INSERT INTO orders (id, tenant_id, email, status, total_cents, idempotency_key) VALUES (?, 'noma', ?, 'pending', ?, ?)").bind(orderId, body.email, total, idempotencyKey), ...items.map((item) => env.DB.prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)").bind(orderId, item.id, item.quantity, item.price_cents))]);
    if (shipping) items.push({ name: "Shipping", price_cents: shipping, quantity: 1 });
    const session = await createStripeSession(env, orderId, body.email, items, idempotencyKey);
    if (!session?.url) { await env.DB.prepare("UPDATE orders SET status = 'payment_failed' WHERE id = ?").bind(orderId).run(); return json({ error: "Unable to initiate payment" }, 502); }
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
  if (!sameText(expected, received)) return new Response("Invalid signature", { status: 400 });
  let event;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid event", { status: 400 }); }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object;
    if (!session || session.mode !== "payment" || session.payment_status !== "paid" || session.currency !== "brl") return new Response("ok");
    const orderId = event.data.object.client_reference_id;
    const order = await env.DB.prepare("SELECT status, total_cents, payment_id FROM orders WHERE id = ?").bind(orderId).first();
    if (order?.status === "pending" && order.payment_id === session.id && Number(session.amount_total) === Number(order.total_cents)) {
      const { results } = await env.DB.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").bind(orderId).all();
      const batch = await env.DB.batch([...results.map((item) => env.DB.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?").bind(item.quantity, item.product_id, item.quantity)), env.DB.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").bind(orderId)]);
      if (batch.slice(0, -1).some((result) => result.meta?.changes !== 1)) throw new Error("Insufficient stock during fulfillment");
    }
  }
  return new Response("ok");
}

export default { async fetch(request, env) { try { const path = new URL(request.url).pathname; if (path === "/api/webhooks/stripe" && request.method === "POST") return security(await webhook(request, env)); if (path.startsWith("/api/")) return cors(await api(request, env), env); return security(await env.ASSETS.fetch(request)); } catch (error) { console.error(error); return json({ error: "Internal server error" }, 500); } } };
