const admin = require("firebase-admin");

const getServiceAccount = () => {
  const jsonPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  const jsonB64 = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64 || "").trim();

  if (jsonB64) {
    try {
      const raw = Buffer.from(jsonB64, "base64").toString("utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (jsonPath) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(jsonPath);
    } catch {
      return null;
    }
  }

  return null;
};

const initAdmin = () => {
  if (admin.apps.length) return admin;
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
};

module.exports = { initAdmin };

