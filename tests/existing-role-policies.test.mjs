import test from "node:test";
import assert from "node:assert/strict";
import { runtimePolicies } from "../scripts/existing-role-policies.mjs";
const fixture = () => ({
  StackId: "arn:aws:cloudformation:us-east-1:000000000000:stack/test/id", StackStatus: "CREATE_COMPLETE",
  Outputs: Object.entries({BackendExecutionRoleArn:"arn:aws:iam::000000000000:role/service-role/backend",FrontendExecutionRoleArn:"arn:aws:iam::000000000000:role/service-role/frontend",BackendFunctionName:"test-backend",FrontendFunctionName:"test-frontend",FrontendBucketName:"test-frontend-bucket",DynamoDBTableName:"test-table"}).map(([OutputKey,OutputValue])=>({OutputKey,OutputValue})),
  Parameters: [{ParameterKey:"AIEnabled",ParameterValue:"false"},{ParameterKey:"BedrockModel",ParameterValue:"amazon.nova-micro-v1:0"}]
});
test("external frontend policy cannot access clinical data or AI; resources are exact",()=>{
 const result=runtimePolicies(fixture(),"us-east-1");
 const text=JSON.stringify(result.frontend.policy);assert.ok(!text.includes("dynamodb:"));assert.ok(!text.includes("bedrock:"));
 assert.equal(result.frontend.policy.Statement[1].Resource,"arn:aws:s3:::test-frontend-bucket/*");
 assert.equal(result.backend.policy.Statement[1].Resource,"arn:aws:dynamodb:us-east-1:000000000000:table/test-table");
 assert.ok(!JSON.stringify(result.backend.policy).includes("bedrock:"));
 assert.ok(!JSON.stringify(result).includes('"Resource":"*"'));
});
test("AI permission is generated only when enabled and stays in-region",()=>{
 const stack=fixture();stack.Parameters[0].ParameterValue="true";const r=runtimePolicies(stack,"us-east-1");
 assert.deepEqual(r.backend.policy.Statement[2].Resource,["arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0"]);
 stack.Parameters[1].ParameterValue="us.amazon.nova-micro-v1:0";
 assert.throws(()=>runtimePolicies(stack,"us-east-1"),/Unexpected model/);
});
test("Qwen chat permission is exact and does not make a text-only model valid for vision",()=>{
 const stack=fixture(); stack.Parameters[0].ParameterValue="true"; stack.Parameters[1].ParameterValue="qwen.qwen3-next-80b-a3b";
 stack.Parameters.push({ParameterKey:"BedrockVisionModel",ParameterValue:"amazon.nova-lite-v1:0"});
 const policy=runtimePolicies(stack,"us-east-1").backend.policy;
 assert.deepEqual(policy.Statement[2].Resource,["arn:aws:bedrock:us-east-1::foundation-model/qwen.qwen3-next-80b-a3b","arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0"]);
 stack.Parameters[2].ParameterValue="qwen.qwen3-next-80b-a3b";
 assert.throws(()=>runtimePolicies(stack,"us-east-1"),/Unexpected model/);
});
test("reject same/foreign roles, incomplete stack and incorrect region",()=>{
 const stack=fixture();stack.Outputs[1].OutputValue=stack.Outputs[0].OutputValue;assert.throws(()=>runtimePolicies(stack,"us-east-1"),/separate/);
 const foreign=fixture();foreign.Outputs[0].OutputValue="arn:aws:iam::111111111111:role/backend";assert.throws(()=>runtimePolicies(foreign,"us-east-1"),/foreign role/);
 const incomplete=fixture();incomplete.StackStatus="ROLLBACK_COMPLETE";assert.throws(()=>runtimePolicies(incomplete,"us-east-1"),/successfully deployed/);
 assert.throws(()=>runtimePolicies(fixture(),"ap-southeast-1"),/account\/region/);
});

test("external-role template matches source and contains no IAM-managed resources",async()=>{
 const {readFileSync}=await import("node:fs");const {existingRolesTemplate}=await import("../scripts/prepare-existing-roles.mjs");
 const source=readFileSync(new URL("../lambda-backend/template.yaml",import.meta.url),"utf8");
 const external=readFileSync(new URL("../lambda-backend/template-existing-roles.yaml",import.meta.url),"utf8");
 assert.equal(external,existingRolesTemplate(source));assert.ok(!external.includes("Type: AWS::IAM::"));
 assert.ok(external.includes("Role: !Ref BackendExecutionRoleArn"));assert.ok(external.includes("Role: !Ref FrontendExecutionRoleArn"));
 assert.ok(external.includes("AuthorizationScopes: [openid]"));assert.ok(external.includes("SeparateExecutionRoles:"));
 assert.ok(!external.includes("ReservedConcurrentExecutions:"));
});
