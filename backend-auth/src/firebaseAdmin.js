const admin = require("firebase-admin");
const fs = require("fs");

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!p) throw new Error("Falta FIREBASE_SERVICE_ACCOUNT_PATH en .env");

  const raw = fs.readFileSync(p, "utf8");
  const sa = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });

  return admin;
}

module.exports = { admin, initFirebaseAdmin };
