// Administrator-only CLI: binds existing Cognito accounts to synthetic patient records.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const [stack, region, configPath, flag] = process.argv.slice(2);
if (!stack || !["us-east-1","ap-southeast-1","ap-southeast-7"].includes(region) || !configPath) throw new Error("Usage: node scripts/provision-demo.mjs STACK REGION config.json [--apply]");
const config = JSON.parse(readFileSync(configPath,"utf8"));
for (const role of ["patient","caregiver","doctor"]) if (!/^[^\s"\\@]+@[^\s"\\@]+\.[^\s"\\@]+$/.test(config[role] || "")) throw new Error(`Missing email for ${role}`);
if (new Set(Object.values(config)).size !== 3) throw new Error("Use three separate accounts");
const aws = (...args) => JSON.parse(execFileSync("aws", [...args, "--region", region, "--output", "json"], {encoding:"utf8",stdio:["ignore","pipe","pipe"]}) || "{}");
const outputs = Object.fromEntries(aws("cloudformation","describe-stacks","--stack-name",stack).Stacks[0].Outputs.map(o=>[o.OutputKey,o.OutputValue]));
const patientId="P-0001", doctorId="DOC-001", caregiverId="C-0001";
const now = new Date().toISOString();
const profile={id:patientId,citizenId:"",name:"ผู้ป่วยตัวอย่าง",age:58,gender:"ชาย",diagnosis:["โรคประจำตัวตัวอย่าง"],allergies:[],medications:[],doctorId,caregiverId,hospital:"โรงพยาบาลตัวอย่าง",healthScore:null,email:config.patient};
const doctor={id:doctorId,name:"แพทย์ตัวอย่าง",specialty:"เวชปฏิบัติทั่วไป",hospital:"โรงพยาบาลตัวอย่าง",email:config.doctor};
const caregiver={id:caregiverId,name:"ผู้ดูแลตัวอย่าง",patientId,relationship:"ผู้ดูแลที่ได้รับมอบหมาย",email:config.caregiver,mcsiScore:0};
const records=[{PK:`PATIENT#${patientId}`,SK:"PROFILE",...profile,version:1},{PK:`DIRECTORY#${doctorId}`,SK:"PROFILE",...doctor,version:1},{PK:`PATIENT#${patientId}`,SK:`CAREGIVER#${caregiverId}`,...caregiver,version:1},
{PK:`PATIENT#${patientId}`,SK:`CONSENT#${doctorId}`,id:"CONSENT-001",patientId,doctorId,hospital:doctor.hospital,reason:"ขอเข้าถึงข้อมูลเพื่อทดลอง workflow",status:"waiting",date:now,version:1},
{PK:`PATIENT#${patientId}`,SK:"PLAN#PLAN-001",id:"PLAN-001",patientId,doctorId,status:"published",updatedAt:now,summary:"แผนตัวอย่างสำหรับทดสอบระบบ โปรดให้แพทย์ตรวจสอบก่อนใช้",medication:[],diet:[],exercise:[],measurement:["บันทึกค่าวัดตามคำแนะนำของแพทย์"],followUp:[],lifestyle:[],tasks:[{id:"TASK-001",title:"บันทึกสุขภาพ",category:"measurement",time:"08:00",detail:"ตรวจข้อมูลก่อนบันทึก",status:"pending"}],version:1}];
for(let day=0;day<30;day++) { const date=new Date(Date.now()-day*86400000).toISOString();records.push({PK:`PATIENT#${patientId}`,SK:`RECORD#R-${day}`,id:`R-${day}`,patientId,date,systolic:120+day%8,diastolic:75+day%5,bloodSugar:100+day%9,bloodSugarTiming:"before-meal",heartRate:70,weight:70,height:170,sleepHours:7,exerciseMinutes:20,medicationTaken:true,foodScore:80,waterGlasses:8,source:"patient",confirmationStatus:"confirmed",version:1}); }
for(const [role,entityId,person] of [["patient",patientId,profile],["doctor",doctorId,doctor],["caregiver",caregiverId,caregiver]]) {
 const users=aws("cognito-idp","list-users","--user-pool-id",outputs.CognitoUserPoolId,"--filter",`email = "${config[role]}"`).Users;
 if(users.length!==1) throw new Error(`Create exactly one Cognito account for ${role} first`);
 const sub=users[0].Attributes.find(a=>a.Name==="sub")?.Value;if(!sub)throw new Error("Cognito subject missing");
 records.push({PK:`USER#${sub}`,SK:"PROFILE",entityId,role,patientIds:[patientId],name:person.name,email:config[role],version:1});
}
if(flag!=="--apply") {console.log(`Dry run: ${records.length} synthetic records and role mappings. Review the script, then add --apply to write. Existing items will never be overwritten.`);process.exit(0);}
function marshal(v) { if(v===null)return {NULL:true};if(typeof v==="string")return {S:v};if(typeof v==="number")return {N:String(v)};if(typeof v==="boolean")return {BOOL:v};if(Array.isArray(v))return {L:v.map(marshal)};return {M:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,marshal(x)]))}; }
let created=0,existing=0;
for(const record of records) {
 try {aws("dynamodb","put-item","--table-name",outputs.DynamoDBTableName,"--item",JSON.stringify(marshal(record).M),"--condition-expression","attribute_not_exists(PK)");created++;}
 catch(error){if(String(error.stderr).includes("ConditionalCheckFailedException")){existing++;continue;}throw error;}
}
console.log(`Created ${created} records; preserved ${existing} existing records. Patient consent starts waiting; approve it in the patient portal before testing doctor access.`);
