#!/usr/bin/env bun
/**
 * Dashboard server + loop trigger API
 * Serves dashboard.html + state.json + trigger endpoint
 */

const PORT = 3458;
const BASE = import.meta.dir;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Trigger loop
    if (url.pathname === "/api/trigger" && req.method === "POST") {
      const proc = Bun.spawn(["bun", "run", `${BASE}/loop.ts`, "--once"], {
        stdout: "pipe", stderr: "pipe",
      });
      const out = await new Response(proc.stdout).text();
      return new Response(JSON.stringify({ ok: true, output: out }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Serve state.json
    if (url.pathname === "/state.json" || url.pathname.endsWith("/state.json")) {
      const file = Bun.file(`${BASE}/state.json`);
      return new Response(file, {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      });
    }

    // Serve dashboard
    const file = Bun.file(`${BASE}/dashboard.html`);
    return new Response(file, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`🧠 Consciousness Loop Dashboard — http://localhost:${PORT}`);
