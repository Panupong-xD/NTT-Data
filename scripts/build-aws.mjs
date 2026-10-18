import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const envFile = resolve(process.argv[2] || ".env.aws.local");
if (!existsSync(envFile)) throw new Error(`Missing ${envFile}; generate it with scripts/aws-config.mjs`);
const config = Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/).filter(line => line && !line.startsWith("#")).map(line => { const i = line.indexOf("="); return [line.slice(0,i), line.slice(i+1)]; }));
if (config.NEXT_PUBLIC_APP_MODE !== "aws" || !config.NEXT_PUBLIC_COGNITO_CLIENT_ID || !config.NEXT_PUBLIC_COGNITO_DOMAIN?.startsWith("https://")) throw new Error("Incomplete AWS configuration");
// Process environment takes precedence over any stale .env.local values.
const result = spawnSync("npm", ["run", "build"], { stdio: "inherit", env: { ...process.env, ...config } });
if (result.status) process.exit(result.status);
function check(dir) { for (const entry of readdirSync(dir)) { const path = resolve(dir,entry); const info = statSync(path); if (info.isDirectory()) check(path); else if (info.size > 4_000_000) throw new Error(`Asset exceeds Lambda response budget: ${path}`); } }
check(resolve("out"));
writeFileSync("out/wellync-build.json", JSON.stringify({ mode: "aws", clientId: config.NEXT_PUBLIC_COGNITO_CLIENT_ID, domain: config.NEXT_PUBLIC_COGNITO_DOMAIN, builtAt: new Date().toISOString() }));
console.log("AWS static build is ready in out/");
