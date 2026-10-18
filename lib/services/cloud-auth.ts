"use client";
import type { AppUser } from "@/lib/types";

const TOKEN_KEY = "wellync-access-token";
const EXPIRY_KEY = "wellync-access-expiry";
const config = () => {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!domain?.startsWith("https://") || !clientId) throw new Error("ยังไม่ได้ตั้งค่า Cognito");
  return { domain: domain.replace(/\/$/, ""), clientId };
};
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export function accessToken() {
  if (typeof window === "undefined") return null;
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY));
  if (!expiry || Date.now() >= expiry) { sessionStorage.removeItem(TOKEN_KEY); return null; }
  return sessionStorage.getItem(TOKEN_KEY);
}
export async function beginSignIn() {
  const { domain, clientId } = config();
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem("wellync-pkce", verifier);
  sessionStorage.setItem("wellync-oauth-state", state);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const params = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: `${location.origin}/auth/callback/`, scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256" });
  location.assign(`${domain}/oauth2/authorize?${params}`);
}
export async function completeSignIn() {
  const { domain, clientId } = config();
  const params = new URLSearchParams(location.search);
  const expectedState = sessionStorage.getItem("wellync-oauth-state");
  const verifier = sessionStorage.getItem("wellync-pkce");
  sessionStorage.removeItem("wellync-oauth-state"); sessionStorage.removeItem("wellync-pkce");
  history.replaceState(null, "", "/auth/callback/");
  if (!expectedState || params.get("state") !== expectedState || !verifier || !params.get("code")) throw new Error("ตรวจสอบการเข้าสู่ระบบไม่ผ่าน กรุณาเริ่มใหม่");
  const res = await fetch(`${domain}/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code: params.get("code")!, redirect_uri: `${location.origin}/auth/callback/`, code_verifier: verifier }), signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
  const data = await res.json();
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") throw new Error("Invalid sign-in response");
  // No refresh/ID token is persisted. Short access tokens remain within this browser tab.
  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000 - 30000));
}
export async function cloudRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = accessToken();
  if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...init.headers, "Content-Type": "application/json", Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(28000) });
  const body = await res.json();
  if (!res.ok) {
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); window.dispatchEvent(new Event("wellync-auth-expired")); }
    const reference = res.status >= 500 && typeof body.requestId === "string" ? ` (รหัสอ้างอิง: ${body.requestId})` : "";
    throw new Error((body.error || "บันทึกหรือโหลดข้อมูลไม่สำเร็จ") + reference);
  }
  return body as T;
}
export async function currentCloudUser() { return (await cloudRequest<{ user: AppUser }>("/api/me")).user; }
export function cloudSignOut() {
  for (const key of [TOKEN_KEY, EXPIRY_KEY, "wellync-pkce", "wellync-oauth-state", "appt_popup_shown"]) sessionStorage.removeItem(key);
  const { domain, clientId } = config();
  location.assign(`${domain}/logout?${new URLSearchParams({ client_id: clientId, logout_uri: `${location.origin}/login/` })}`);
}
