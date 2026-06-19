import { SignJWT, jwtVerify } from "jose";

const DEV_FALLBACK = "dev-secret-change-me";
const rawSecret = process.env.AUTH_SECRET;

// فشل سريع عند تشغيل الإنتاج إن لم يُضبط سرّ قويّ (الجلسات قابلة للتزوير بسرٍّ افتراضي).
// يُتخطّى أثناء البناء (phase-production-build) كي لا يفشل البناء على بيئة بلا أسرار.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (process.env.NODE_ENV === "production" && !isBuildPhase && (!rawSecret || rawSecret === DEV_FALLBACK)) {
  throw new Error(
    "AUTH_SECRET غير مضبوط في الإنتاج — عيّن قيمة قويّة فريدة (مثل: openssl rand -base64 32).",
  );
}

const secret = new TextEncoder().encode(rawSecret ?? DEV_FALLBACK);

export type SessionPayload = {
  sub: string; // user id
  type: "student" | "teacher" | "admin";
  email: string;
};

const ALG = "HS256";
const MAX_AGE = 60 * 60 * 24 * 7; // أسبوع

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ type: payload.type, email: payload.email })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      type: payload.type as SessionPayload["type"],
      email: (payload.email as string) ?? "",
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "elhafazah_session";
export const SESSION_MAX_AGE = MAX_AGE;
