import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
export const s3 = new S3Client({ maxAttempts: 2 });
const headers = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  // Next static export uses inline hydration scripts. No eval or third-party scripts.
  "Content-Security-Policy": `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${process.env.COGNITO_DOMAIN || ''}; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`
};
export async function handler(event: APIGatewayProxyEventV2) {
  let path: string;
  try { path = decodeURIComponent(event.rawPath); } catch { return { statusCode: 400, body: "Invalid path" }; }
  if (path.startsWith("/api/") || path.split("/").some(p => p === ".." || p === ".") || /[\\\x00-\x1f]/.test(path)) return { statusCode: 404, body: "Not found" };
  const key = path.replace(/^\//, "") || "index.html";
  const objectKey = path.endsWith("/") ? `${path.slice(1)}index.html` : key.includes(".") ? key : `${key}/index.html`;
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: process.env.FRONTEND_BUCKET, Key: objectKey }));
    if ((result.ContentLength || 0) > 4_000_000) return { statusCode: 413, headers, body: "Asset too large" };
    const bytes = await result.Body!.transformToByteArray();
    return { statusCode: 200, headers: { ...headers, "Content-Type": result.ContentType || "application/octet-stream", "Cache-Control": objectKey.startsWith("_next/static/") ? "public, max-age=31536000, immutable" : "no-cache" }, isBase64Encoded: true, body: Buffer.from(bytes).toString("base64") };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404 && status !== 403) console.error(JSON.stringify({ event: "static_fetch_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return { statusCode: status === 404 || status === 403 ? 404 : 503, headers, body: "Page unavailable" };
  }
}
