const https = require("https");
const querystring = require("querystring");

const BASE = "elima-eight.vercel.app";
let cookieJar = {};

function parseCookies(headerVal) {
  if (!headerVal) return;
  const list = Array.isArray(headerVal) ? headerVal : [headerVal];
  list.forEach(c => {
    const [kv] = c.split(";");
    const [k, v] = kv.trim().split("=");
    if (k && v !== undefined) cookieJar[k.trim()] = v.trim();
  });
}

function cookieHeader() {
  return Object.entries(cookieJar).map(([k,v]) => `${k}=${v}`).join("; ");
}

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: BASE, port: 443, path, method: "GET", headers: { Cookie: cookieHeader() }};
    const req = https.request(opts, res => {
      parseCookies(res.headers["set-cookie"]);
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    req.end();
  });
}

function post(path, data, contentType = "application/x-www-form-urlencoded") {
  const payload = typeof data === "string" ? data : 
    contentType === "application/json" ? JSON.stringify(data) : querystring.stringify(data);
  
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE, port: 443, path, method: "POST",
      headers: { "Content-Type": contentType, "Content-Length": Buffer.byteLength(payload), Cookie: cookieHeader() }
    };
    const req = https.request(opts, res => {
      parseCookies(res.headers["set-cookie"]);
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("=== Step 1: Get CSRF Token ===");
  const csrfRes = await get("/api/auth/csrf");
  console.log(`Status: ${csrfRes.status}`);
  let csrfToken = "";
  try {
    const parsed = JSON.parse(csrfRes.body);
    csrfToken = parsed.csrfToken || "";
    console.log(`CSRF Token: ${csrfToken.substring(0, 20)}...`);
  } catch(e) {
    console.log(`CSRF Body: ${csrfRes.body.substring(0, 200)}`);
  }
  console.log(`Cookies after CSRF: ${JSON.stringify(Object.keys(cookieJar))}`);
  
  console.log("\n=== Step 2: Submit Login ===");
  const loginRes = await post("/api/auth/callback/credentials", {
    email: "admin@elima.com",
    password: "Admin123!",
    csrfToken,
    redirect: "false",
    callbackUrl: "https://elima-eight.vercel.app/",
    json: "true"
  });
  console.log(`Status: ${loginRes.status}`);
  console.log(`Location: ${loginRes.headers.location || "N/A"}`);
  console.log(`Body: ${loginRes.body.substring(0, 300)}`);
  console.log(`Cookies after login: ${JSON.stringify(Object.keys(cookieJar))}`);
  const hasSessionCookie = Object.keys(cookieJar).some(k => k.includes("session") || k.includes("token"));
  console.log(`Has session token: ${hasSessionCookie}`);
  
  console.log("\n=== Step 3: Get Session State ===");
  const sessionRes = await get("/api/auth/session");
  console.log(`Status: ${sessionRes.status}`);
  console.log(`Session: ${sessionRes.body.substring(0, 300)}`);
  
  console.log("\n=== Step 4: Check NEXTAUTH_URL via providers ===");
  const providersRes = await get("/api/auth/providers");
  console.log(`Status: ${providersRes.status}`);
  console.log(`Body: ${providersRes.body.substring(0, 400)}`);
  
  console.log("\n=== DIAGNOSIS ===");
  try {
    const session = JSON.parse(sessionRes.body);
    if (session && session.user) {
      console.log("✅ SESSION IS VALID - User:", session.user.email);
    } else {
      console.log("❌ SESSION IS EMPTY - Login did not persist");
      console.log("   Possible causes:");
      console.log("   1. NEXTAUTH_URL mismatch (check providers output above)");
      console.log("   2. NEXTAUTH_SECRET mismatch between sign and verify");
      console.log("   3. Cookie domain/secure flag issue");
    }
  } catch(e) {
    console.log("Could not parse session:", e.message);
  }
}

main().catch(console.error);
