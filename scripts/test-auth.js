const https = require("https");

async function testAuth() {
  console.log("Testing POST /api/auth/register on https://elima-eight.vercel.app");
  
  const payload = JSON.stringify({
    name: "Test User",
    email: "test.fail@example.com",
    password: "Password123!"
  });

  const options = {
    hostname: "elima-eight.vercel.app",
    port: 443,
    path: "/api/auth/register",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": payload.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding("utf8");
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      console.log(`BODY: ${body}`);
      testLogin();
    });
  });

  req.on("error", (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

function testLogin() {
  console.log("\nTesting POST /api/auth/callback/credentials (NextAuth Login)");
  
  const payload = Buffer.from(new URLSearchParams({
    email: "admin@elima.com",
    password: "Admin123!",
    redirect: "false",
    csrfToken: "",
    callbackUrl: "https://elima-eight.vercel.app/login"
  }).toString());

  const options = {
    hostname: "elima-eight.vercel.app",
    port: 443,
    path: "/api/auth/callback/credentials",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": payload.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      console.log(`BODY: ${body}`);
    });
  });

  req.write(payload);
  req.end();
}

testAuth();
