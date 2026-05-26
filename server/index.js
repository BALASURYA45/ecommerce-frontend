const express = require("express");
require("dotenv").config();
const { initAdmin } = require("./firebase-admin");

const PORT = Number(process.env.PORT || 8787);

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  const env = String(process.env.NODE_ENV || "development");

  // Dev-friendly CORS:
  // - In development, allow any origin unless explicitly restricted by ALLOWED_ORIGINS.
  // - In production, require ALLOWED_ORIGINS to include the exact origin.
  const allowAny = env !== "production" && allowedOrigins.length === 0;
  const allowed = allowAny || allowedOrigins.includes(origin);

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
  }
  return next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
// Payment modules intentionally removed.

const requireAdminToken = (req, res) => {
  const token = String(req.headers["x-admin-token"] || "").trim();
  const expected = String(process.env.ADMIN_API_TOKEN || "").trim();
  if (!expected) return res.status(500).json({ error: "Admin token not configured" });
  if (!token || token !== expected) return res.status(401).json({ error: "Unauthorized" });
  return null;
};

app.post("/api/admin/set-admin-claim", async (req, res) => {
  const denied = requireAdminToken(req, res);
  if (denied) return;

  const adminSdk = initAdmin();
  if (!adminSdk) return res.status(500).json({ error: "Firebase Admin not configured" });

  const uid = String(req.body?.uid || "").trim();
  const isAdmin = Boolean(req.body?.admin);
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  try {
    await adminSdk.auth().setCustomUserClaims(uid, { admin: isAdmin });
    res.json({ ok: true, uid, admin: isAdmin });
  } catch {
    res.status(500).json({ error: "Failed to set custom claims" });
  }
});

app.post("/api/admin/lookup-user", async (req, res) => {
  const denied = requireAdminToken(req, res);
  if (denied) return;

  const adminSdk = initAdmin();
  if (!adminSdk) return res.status(500).json({ error: "Firebase Admin not configured" });

  const email = String(req.body?.email || "").trim();
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const user = await adminSdk.auth().getUserByEmail(email);
    res.json({ uid: user.uid, email: user.email, claims: user.customClaims || {} });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[shopsmart-server] listening on http://localhost:${PORT}`);
});
