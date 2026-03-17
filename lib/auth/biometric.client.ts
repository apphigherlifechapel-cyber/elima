import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

export async function registerBiometrics() {
  const res = await fetch("/api/auth/webauthn/register/options");
  const options = await res.json();

  if (options.error) throw new Error(options.error);

  const registrationResponse = await startRegistration(options);

  const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registrationResponse),
  });

  const verificationResult = await verifyRes.json();
  if (verificationResult.error) throw new Error(verificationResult.error);

  return verificationResult;
}

export async function authenticateBiometrics() {
  const res = await fetch("/api/auth/webauthn/authenticate/options");
  const options = await res.json();

  if (options.error) throw new Error(options.error);

  const authenticationResponse = await startAuthentication(options);

  const verifyRes = await fetch("/api/auth/webauthn/authenticate/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authenticationResponse),
  });

  const verificationResult = await verifyRes.json();
  if (verificationResult.error) throw new Error(verificationResult.error);

  return verificationResult;
}
