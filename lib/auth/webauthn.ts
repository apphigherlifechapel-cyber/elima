import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db/prisma";
import type { Authenticator } from "@prisma/client";

const rpName = "Elima Store";
const rpID = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost";
const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function getRegistrationOptions(userId: string, userEmail: string) {
  const userAuthenticators = await prisma.authenticator.findMany({
    where: { userId },
  });

  return generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: userEmail,
    attestationType: "none",
    excludeCredentials: userAuthenticators.map((auth) => ({
      id: auth.credentialID, // already base64 string in DB or should be converted
      type: "public-key",
      transports: auth.transports ? (JSON.parse(auth.transports) as any) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });
}

export async function verifyRegistration(userId: string, body: any, expectedChallenge: string) {
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo;

    await prisma.authenticator.create({
      data: {
        userId,
        credentialID: Buffer.from(credential.id).toString("base64url"),
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        credentialDeviceType: verification.registrationInfo.credentialDeviceType,
        credentialBackedUp: verification.registrationInfo.credentialBackedUp,
        transports: JSON.stringify(body.response.transports || []),
      },
    });
  }

  return verification;
}

export async function getAuthenticationOptions(userId: string) {
  const userAuthenticators = await prisma.authenticator.findMany({
    where: { userId },
  });

  return generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map((auth) => ({
      id: auth.credentialID,
      type: "public-key",
      transports: auth.transports ? (JSON.parse(auth.transports) as any) : undefined,
    })),
    userVerification: "preferred",
  });
}

export async function verifyAuthentication(userId: string, body: any, expectedChallenge: string) {
  const authenticator = await prisma.authenticator.findFirst({
    where: {
      credentialID: body.id,
      userId,
    },
  });

  if (!authenticator) {
    throw new Error("Authenticator not found");
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(authenticator.credentialID, "base64url"),
      credentialPublicKey: authenticator.credentialPublicKey,
      counter: Number(authenticator.counter),
      transports: authenticator.transports ? (JSON.parse(authenticator.transports) as any) : undefined,
    },
  });

  if (verification.verified) {
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });
  }

  return verification;
}
