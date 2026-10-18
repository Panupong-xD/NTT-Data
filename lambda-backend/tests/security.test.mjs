import test from "node:test";
import assert from "node:assert/strict";
process.env.DYNAMODB_TABLE = "test";
process.env.AI_ENABLED = "true";
process.env.BEDROCK_MODEL = "amazon.nova-micro-v1:0";
const { handler } = await import("../dist/handler.js");
const { docClient, reserveAIUsage } = await import("../dist/db.js");
const { bedrock, chatSchema } = await import("../dist/chatHandler.js");
const { validateMutation } = await import("../dist/stateHandler.js");
const { s3, handler: staticHandler } = await import("../dist/staticHandler.js");
const patient = { sub:"sub-p", entityId:"P-1", role:"patient", patientIds:["P-1"], name:"Synthetic Patient", email:"patient@example.test" };
const doctor = { sub:"sub-d", entityId:"D-1", role:"doctor", patientIds:["P-1"], name:"Synthetic Doctor", email:"doctor@example.test" };
const caregiver = { ...patient, entityId:"C-1", role:"caregiver" };
const profile = { id:"P-1", name:"Synthetic Patient", citizenId:"", age:50, gender:"", diagnosis:[], medications:[], allergies:[], doctorId:"D-1", caregiverId:"C-1", hospital:"Demo", email:patient.email, healthScore:null, version:1 };
const event = (path, method="GET", body, sub="sub-p", tokenUse="access") => ({ rawPath:path, requestContext:{requestId:"test", http:{method}, authorizer:{jwt:{claims:sub ? {sub,token_use:tokenUse} : {}}}}, body:body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
let items, calls, modelCalls;
const key = (pk,sk) => `${pk}|${sk}`;
function reset() {
  items = new Map([[key("USER#sub-p","PROFILE"), patient], [key("USER#sub-d","PROFILE"), doctor], [key("PATIENT#P-1","PROFILE"), {...profile,PK:"PATIENT#P-1",SK:"PROFILE"}]]);
  calls=[]; modelCalls=0;
  docClient.send = async command => {
    calls.push(command);
    const x = command.input;
    if (command.constructor.name === "GetCommand") return {Item:items.get(key(x.Key.PK,x.Key.SK))};
    if (command.constructor.name === "QueryCommand") return {Items:[...items.entries()].filter(([k])=>k.startsWith(`${x.ExpressionAttributeValues[":pk"]}|${x.ExpressionAttributeValues[":prefix"] || ""}`)).map(([,v])=>v)};
    if (command.constructor.name === "UpdateCommand") throw Object.assign(new Error(), {name:"ConditionalCheckFailedException"});
    return {};
  };
  bedrock.send = async () => { modelCalls++; return {output:{message:{content:[{text:"คำแนะนำทั่วไป"}]}}, usage:{inputTokens:100,outputTokens:20},stopReason:"end_turn"}; };
}

test("unauthenticated and ID tokens cannot access data", async()=>{ reset(); for(const e of [event("/api/me","GET",undefined,null),event("/api/me","GET",undefined,"sub-p","id")]) assert.equal((await handler(e)).statusCode,401); });
test("patient state loads without an empty sort-key operand and stays inside its partition", async () => {
  reset();
  const send = docClient.send;
  docClient.send = async command => {
    if (command.constructor.name === 'QueryCommand') {
      const input = command.input;
      if (input.ExpressionAttributeValues[':prefix'] === '') throw Object.assign(new Error('Empty key operand'), {name: 'ValidationException'});
      assert.equal(input.ExpressionAttributeValues[':pk'], 'PATIENT#P-1');
    }
    return send(command);
  };
  const response = await handler(event('/api/state'));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).db.patients[0].id, 'P-1');
});
test("unprovisioned user is denied",async()=>{ reset(); assert.equal((await handler(event("/api/me","GET",undefined,"unknown"))).statusCode,403); });
test("malformed JSON and arbitrary model selection are rejected",async()=>{ reset(); assert.equal((await handler(event("/api/ai/chat","POST","{"))).statusCode,400); assert.equal(chatSchema.safeParse({content:"hi",model:"expensive-model"}).success,false); });
test("patient cannot use another patient's history or model",async()=>{ reset(); const res=await handler(event("/api/ai/chat","POST",{content:"hello",patientId:"P-2",sessionId:"shared"})); assert.equal(res.statusCode,403); assert.equal(modelCalls,0); });
test("doctor requires patient consent for chat",async()=>{ reset(); assert.equal((await handler(event("/api/ai/chat","POST",{content:"hi",patientId:"P-1"},"sub-d"))).statusCode,403); });
test("emergency wording produces immediate response without model or fabricated dispatch",async()=>{ reset(); const res=await handler(event("/api/ai/chat","POST",{content:"เจ็บหน้าอก"})); assert.equal(res.statusCode,200); assert.equal(JSON.parse(res.body).modelUsed,"safety-message"); assert.equal(modelCalls,0); });
test("normal chat is namespaced by verified subject, stores TTL and reserves budget first",async()=>{ reset(); const res=await handler(event("/api/ai/chat","POST",{content:"การพักผ่อน",sessionId:"shared"})); assert.equal(res.statusCode,200); const query=calls.find(c=>c.constructor.name==="QueryCommand"); assert.equal(query.input.ExpressionAttributeValues[":pk"],"CHAT#sub-p#P-1#shared"); const reserve=calls.findIndex(c=>c.constructor.name==="TransactWriteCommand"); const save=calls.findIndex(c=>c.constructor.name==="PutCommand"); assert.ok(reserve>=0&&save>reserve); assert.ok(calls[save].input.Item.ttl>Date.now()/1000); assert.equal(modelCalls,1); });
test("budget failures stop model invocation, do not use a fallback",async()=>{ reset(); const send=docClient.send; docClient.send=async c=>{if(c.constructor.name==="TransactWriteCommand")throw Object.assign(new Error(),{name:"TransactionCanceledException"});return send(c);}; assert.equal((await handler(event("/api/ai/chat","POST",{content:"hello"}))).statusCode,429); assert.equal(modelCalls,0); });
test("request larger than daily budget is rejected before transaction",async()=>{ reset(); await assert.rejects(reserveAIUsage("sub",300000),e=>e.status===429); assert.equal(calls.length,0); });
test("database failure returns service error without fake patient or raw exception",async()=>{ reset(); docClient.send=async()=>{throw new Error("secret raw failure");}; const r=await handler(event("/api/me")); assert.equal(r.statusCode,503); assert.ok(!r.body.includes("secret")); assert.equal(JSON.parse(r.body).requestId,"test"); });
test("approvals require doctor and explicit decisions",async()=>{ reset(); assert.equal((await handler(event("/api/approvals","POST",{actionId:"a",patientId:"P-1",decision:"APPROVED"}))).statusCode,403); assert.equal((await handler(event("/api/approvals","POST",{actionId:"a",patientId:"P-1"},"sub-d"))).statusCode,400); });
test("approval decision fails on already reviewed record",async()=>{ reset();items.set(key("PATIENT#P-1","CONSENT#D-1"),{status:"approved"}); const send=docClient.send; docClient.send=async c=>{if(c.constructor.name==="TransactWriteCommand"){calls.push(c);throw Object.assign(new Error(),{name:"TransactionCanceledException"});}return send(c);};const r=await handler(event("/api/approvals","POST",{actionId:"a",patientId:"P-1",decision:"APPROVED"},"sub-d")); assert.equal(r.statusCode,409); const tx=calls.find(c=>c.constructor.name==="TransactWriteCommand").input.TransactItems; assert.equal(tx[0].Update.ExpressionAttributeValues[":by"],"D-1"); assert.equal(tx[0].Update.Key.SK,"APPROVAL#a");assert.equal(tx[1].ConditionCheck.Key.SK,"CONSENT#D-1"); });
test("caregiver cannot approve consent; patient cannot alter physician or medication",()=>{ reset(); const consent={id:"consent",doctorId:"D-1",status:"waiting"}; assert.throws(()=>validateMutation(caregiver,"consents",consent,{...consent,status:"approved"}),e=>e.status===403); assert.throws(()=>validateMutation(patient,"patients",profile,{...profile,doctorId:"D-2"}),e=>e.status===403); assert.throws(()=>validateMutation(patient,"patients",profile,{...profile,medications:["new"]}),e=>e.status===403); });
test("patient cannot confirm own measurement or modify a reviewed record",()=>{ const r={id:"record",source:"patient",confirmationStatus:"pending"}; assert.throws(()=>validateMutation(patient,"healthRecords",r,{...r,confirmationStatus:"confirmed"}),e=>e.status===403); assert.throws(()=>validateMutation(patient,"healthRecords",{...r,confirmationStatus:"confirmed"},null),e=>e.status===403); });
test("task changes cannot modify treatment instructions and drafts cannot be published by patient",()=>{ const p={id:"plan",status:"published",medication:["old"],tasks:[]}; assert.throws(()=>validateMutation(patient,"carePlans",p,{...p,medication:["new"]}),e=>e.status===403); assert.throws(()=>validateMutation(doctor,"carePlans",p,{...p,status:"draft"}),e=>e.status===403); });
test("doctor without consent receives no clinical data",async()=>{reset(); const r=await handler(event("/api/state","GET",undefined,"sub-d")); assert.equal(r.statusCode,200); const db=JSON.parse(r.body).db; assert.deepEqual(db.patients[0].diagnosis,[]); assert.equal(db.patients[0].citizenId,""); assert.deepEqual(db.carePlans,[]);});
test("fake images and oversized content are rejected before inference",async()=>{reset(); process.env.BEDROCK_VISION_MODEL="amazon.nova-lite-v1:0"; const r=await handler(event("/api/ai/chat","POST",{content:"read",files:[{name:"x",type:"image/png",data:"ZmFrZQ=="}]}));assert.equal(r.statusCode,400);assert.equal(modelCalls,0);assert.equal(chatSchema.safeParse({content:"a".repeat(3001)}).success,false);});
test("static frontend blocks traversal and API paths",async()=>{for(const rawPath of ["/api/me","/%2e%2e/private","/x%5cy"]) assert.equal((await staticHandler({rawPath})).statusCode,404);});
test("static frontend serves nested export route through private S3 with security headers",async()=>{s3.send=async c=>{assert.equal(c.input.Key,"patient/health/index.html");return {Body:{transformToByteArray:async()=>Buffer.from("hello")},ContentType:"text/html",ContentLength:5};}; const r=await staticHandler({rawPath:"/patient/health/"});assert.equal(r.statusCode,200);assert.equal(r.isBase64Encoded,true);assert.equal(r.headers["X-Frame-Options"],"DENY");assert.equal(Buffer.from(r.body,"base64").toString(),"hello");});
test("state mutation rejects foreign patient and stale snapshots",async()=>{ reset(); const record={id:"new-record",patientId:"P-2",date:new Date().toISOString(),systolic:120,diastolic:80,bloodSugar:100,heartRate:70,weight:70,height:170,sleepHours:7,exerciseMinutes:20,medicationTaken:true,foodScore:80,waterGlasses:8,source:"patient",confirmationStatus:"pending"}; assert.equal((await handler(event("/api/state","PUT",{operations:[{collection:"healthRecords",before:null,after:record}]}))).statusCode,403);const consent={id:"consent",patientId:"P-1",doctorId:"D-1",hospital:"Demo",reason:"request",date:new Date().toISOString(),status:"waiting"};items.set(key("PATIENT#P-1","CONSENT#D-1"),{...consent,status:"rejected",version:2});assert.equal((await handler(event("/api/state","PUT",{operations:[{collection:"consents",before:consent,after:{...consent,status:"approved"}}]}))).statusCode,409); });
test("patient consent decision creates a conditional atomic write",async()=>{reset();const consent={id:"consent",patientId:"P-1",doctorId:"D-1",hospital:"Demo",reason:"request",date:new Date().toISOString(),status:"waiting"};items.set(key("PATIENT#P-1","CONSENT#D-1"),{...consent,version:1});const r=await handler(event("/api/state","PUT",{operations:[{collection:"consents",before:consent,after:{...consent,status:"approved"}}]}));assert.equal(r.statusCode,200);const tx=calls.find(c=>c.constructor.name==="TransactWriteCommand").input.TransactItems;assert.equal(tx[0].Put.Item.status,"approved");assert.equal(tx[0].Put.Item.version,2);assert.equal(tx[0].Put.ConditionExpression,"version = :version");});
test("doctor publication transaction also checks consent has not been revoked",async()=>{reset(); items.set(key("PATIENT#P-1","CONSENT#D-1"),{status:"approved"}); const plan={id:"plan",patientId:"P-1",doctorId:"D-1",status:"published",updatedAt:new Date().toISOString(),summary:"Reviewed by doctor",medication:[],diet:[],exercise:[],measurement:[],followUp:[],lifestyle:[],tasks:[]};const r=await handler(event("/api/state","PUT",{operations:[{collection:"carePlans",before:null,after:plan}]},"sub-d"));assert.equal(r.statusCode,200);const tx=calls.find(c=>c.constructor.name==="TransactWriteCommand").input.TransactItems;assert.ok(tx.some(op=>op.ConditionCheck?.Key.SK==="CONSENT#D-1"));});
test("doctor can request consent and notify patient before gaining clinical access",async()=>{reset();const now=new Date().toISOString();const consent={id:"consent",patientId:"P-1",doctorId:"D-1",hospital:"Demo",reason:"request",date:now,status:"waiting"};const notification={id:"notice",patientId:"P-1",userRole:"patient",title:"Consent request",message:"Please review",type:"hospital",date:now,read:false};const r=await handler(event("/api/state","PUT",{operations:[{collection:"consents",before:null,after:consent},{collection:"notifications",before:null,after:notification}]},"sub-d"));assert.equal(r.statusCode,200);const tx=calls.find(c=>c.constructor.name==="TransactWriteCommand").input.TransactItems;assert.equal(tx.length,2);});
