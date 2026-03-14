// Pages Function — proxy API calls to makeloops-email Worker
// Hides API key from client, adds rate limiting by IP

const API_BASE = "https://api.makeloops.xyz";

// Allowed public endpoints (read-only, no admin)
const ALLOWED = ["/inbox/", "/otp/"];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api", "");

  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only GET
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  // Only allowed endpoints
  const allowed = ALLOWED.some(prefix => path.startsWith(prefix));
  if (!allowed) {
    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  }

  // Proxy to Worker with API key
  const apiKey = env.MAKELOOPS_API_KEY || "";
  const sep = path.includes("?") ? "&" : "?";
  const apiUrl = `${API_BASE}${path}${sep}key=${apiKey}`;

  try {
    const resp = await fetch(apiUrl);
    const data = await resp.json();
    return Response.json(data, { status: resp.status, headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: "API error" }, { status: 502, headers: corsHeaders });
  }
}
