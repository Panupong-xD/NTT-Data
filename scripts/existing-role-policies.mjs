// Generates reviewed policy files only. It never creates, attaches or updates IAM policies.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const allowedRegions = ["us-east-1", "ap-southeast-1", "ap-southeast-7"];
const allowedModels = ["amazon.nova-micro-v1:0", "amazon.nova-lite-v1:0", "qwen.qwen3-next-80b-a3b"];
export function runtimePolicies(stack, region) {
  if (!allowedRegions.includes(region)) throw new Error("Region is not permitted");
  if (!["CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"].includes(stack.StackStatus)) throw new Error("Stack must be successfully deployed before generating runtime policies");
  const arn = /^arn:aws:cloudformation:([^:]+):(\d{12}):stack\//.exec(stack.StackId || "");
  if (!arn || arn[1] !== region) throw new Error("Stack account/region could not be verified");
  const account = arn[2];
  const outputs = Object.fromEntries((stack.Outputs || []).map(o => [o.OutputKey, o.OutputValue]));
  const params = Object.fromEntries((stack.Parameters || []).map(p => [p.ParameterKey, p.ParameterValue]));
  const role = key => {
    const value = outputs[key] || "";
    if (!value.startsWith(`arn:aws:iam::${account}:role/`) || !/^arn:aws:iam::\d{12}:role\/[A-Za-z0-9+=,.@_/-]+$/.test(value)) throw new Error(`Invalid or foreign role: ${key}`);
    return value;
  };
  const backendRole = role("BackendExecutionRoleArn"), frontendRole = role("FrontendExecutionRoleArn");
  if (backendRole === frontendRole) throw new Error("Frontend and backend roles must be separate");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(outputs.FrontendBucketName || "")) throw new Error("Invalid frontend bucket output");
  if (!/^[A-Za-z0-9_.-]{3,255}$/.test(outputs.DynamoDBTableName || "")) throw new Error("Invalid table output");
  const logging = key => {
    const name = outputs[key];
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name || "")) throw new Error(`Invalid function output: ${key}`);
    return { Effect: "Allow", Action: ["logs:CreateLogStream", "logs:PutLogEvents"], Resource: `arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${name}:*` };
  };
  const backend = [logging("BackendFunctionName"), {
    Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:ConditionCheckItem"],
    Resource: `arn:aws:dynamodb:${region}:${account}:table/${outputs.DynamoDBTableName}`
  }];
  if (params.AIEnabled === "true") {
    const models = [...new Set([params.BedrockModel, params.BedrockVisionModel].filter(Boolean))];
    if (!models.length || models.some(m => !allowedModels.includes(m)) || (params.BedrockVisionModel && params.BedrockVisionModel !== "amazon.nova-lite-v1:0")) throw new Error("Unexpected model or cross-region inference profile");
    backend.push({ Effect: "Allow", Action: ["bedrock:InvokeModel"], Resource: models.map(m => `arn:aws:bedrock:${region}::foundation-model/${m}`) });
  }
  const frontend = [logging("FrontendFunctionName"),
    { Effect: "Allow", Action: ["s3:GetObject"], Resource: `arn:aws:s3:::${outputs.FrontendBucketName}/*` },
    { Effect: "Allow", Action: ["s3:ListBucket"], Resource: `arn:aws:s3:::${outputs.FrontendBucketName}` }
  ];
  return { backend: { roleArn: backendRole, policy: { Version: "2012-10-17", Statement: backend } }, frontend: { roleArn: frontendRole, policy: { Version: "2012-10-17", Statement: frontend } }, aiEnabled: params.AIEnabled === "true" };
}
function main() {
  const [stackName, region = "us-east-1", directory = "/tmp/wellync-role-policies"] = process.argv.slice(2);
  if (!stackName || !allowedRegions.includes(region)) throw new Error("Usage: node scripts/existing-role-policies.mjs STACK REGION [OUTPUT_DIRECTORY]");
  const data = JSON.parse(execFileSync("aws", ["cloudformation", "describe-stacks", "--stack-name", stackName, "--region", region, "--output", "json"], { encoding: "utf8" }));
  const result = runtimePolicies(data.Stacks[0], region);
  const dir = resolve(directory);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const manifest = {};
  for (const kind of ["backend", "frontend"]) {
    const file = resolve(dir, `${stackName}-${kind}.json`);
    writeFileSync(file, JSON.stringify(result[kind].policy, null, 2) + "\n", { mode: 0o600 });
    manifest[kind] = { roleArn: result[kind].roleArn, roleName: result[kind].roleArn.split("/").at(-1), policyFile: file };
  }
  console.log(JSON.stringify({ ...manifest, aiEnabled: result.aiEnabled }, null, 2));
  console.log("Generated policy files only. Review them and configure each role through an authorized IAM administrator or permitted IAM workflow. No IAM policies were changed.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
