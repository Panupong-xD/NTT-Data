import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { HttpError } from "./security.js";

const TABLE_NAME = process.env.DYNAMODB_TABLE || "HealthcareAgentTable";
export const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ maxAttempts: 2 }), {
  marshallOptions: { removeUndefinedValues: true }
});
export async function getItem(PK: string, SK: string) {
  return (await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK }, ConsistentRead: true }))).Item;
}
export async function putItem(item: Record<string, unknown>, condition?: string) {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item, ConditionExpression: condition }));
}
export async function queryItems(PK: string, prefix: string, limit = 100) {
  const result = await docClient.send(new QueryCommand({
    // Loading the whole patient's partition needs no sort-key condition. An empty
    // key operand can be rejected by DynamoDB; never send begins_with(SK, "").
    TableName: TABLE_NAME, KeyConditionExpression: prefix ? "PK = :pk AND begins_with(SK, :prefix)" : "PK = :pk",
    ExpressionAttributeValues: prefix ? { ":pk": PK, ":prefix": prefix } : { ":pk": PK }, ConsistentRead: true, Limit: limit
  }));
  if (result.LastEvaluatedKey) throw new HttpError(413, "Too many records; archive older records before continuing");
  return result.Items || [];
}
export const ttl = () => Math.floor(Date.now() / 1000) + 30 * 86400;

export async function reserveAIUsage(sub: string, units: number, countRequest = true) {
  const day = new Date().toISOString().slice(0, 10); // UTC accounting windows
  const minute = Math.floor(Date.now() / 60000);
  const userLimit = Number(process.env.AI_USER_DAILY_UNITS || 200000);
  const globalLimit = Number(process.env.AI_GLOBAL_DAILY_UNITS || 2000000);
  const maxPerMinute = Number(process.env.AI_REQUESTS_PER_MINUTE || 6);
  if (units > userLimit || units > globalLimit) throw new HttpError(429, "AI request exceeds the daily allowance");
  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        ...(countRequest ? [{ key: `RATE#${sub}#${minute}`, amount: 1, limit: maxPerMinute }] : []),
        { key: `BUDGET#${sub}#${day}`, amount: units, limit: userLimit },
        { key: `BUDGET#GLOBAL#${day}`, amount: units, limit: globalLimit }
      ].map(({ key, amount, limit }) => ({ Update: {
        TableName: TABLE_NAME, Key: { PK: key, SK: "USAGE" },
        UpdateExpression: "SET #used = if_not_exists(#used, :zero) + :amount, #ttl = :ttl",
        ConditionExpression: "attribute_not_exists(#used) OR #used <= :remaining",
        ExpressionAttributeNames: { "#used": "used", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":zero": 0, ":amount": amount, ":remaining": limit - amount, ":ttl": ttl() }
      }}))
    }));
  } catch (error) {
    if ((error as Error).name === "TransactionCanceledException") throw new HttpError(429, "AI usage limit reached; try again later");
    throw error;
  }
}

export async function recentMessages(owner: string, patientId: string, sessionId: string) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME, KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `CHAT#${owner}#${patientId}#${sessionId}`, ":prefix": "TURN#" },
    ScanIndexForward: false, Limit: 3, ConsistentRead: true
  }));
  // TTL removal is asynchronous: expired records must be excluded at read time.
  return (result.Items || []).filter(item => item.ttl > Date.now() / 1000).reverse();
}
export async function saveTurn(owner: string, patientId: string, sessionId: string, user: string, assistant: string, contextVersion?: string) {
  await putItem({ PK: `CHAT#${owner}#${patientId}#${sessionId}`, SK: `TURN#${new Date().toISOString()}#${randomUUID()}`, user, assistant, contextVersion, ttl: ttl() });
}

export async function decideApproval(patientId: string, actionId: string, decision: string, reviewer: string, note?: string) {
  const PK = `PATIENT#${patientId}`;
  const SK = `APPROVAL#${actionId}`;
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: [
      { Update: {
        TableName: TABLE_NAME, Key: { PK, SK },
        UpdateExpression: "SET #status = :decision, reviewedBy = :by, reviewedAt = :now, reviewNote = :note",
        ConditionExpression: "#status = :pending AND (attribute_not_exists(#ttl) OR #ttl > :nowSeconds)",
        ExpressionAttributeNames: { "#status": "status", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":decision": decision, ":by": reviewer, ":now": new Date().toISOString(), ":note": note || "", ":pending": "PENDING", ":nowSeconds": Math.floor(Date.now() / 1000) }
      } },
      { ConditionCheck: {
        TableName: TABLE_NAME, Key: { PK, SK: `CONSENT#${reviewer}` },
        ConditionExpression: "#status = :approved", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":approved": "approved" }
      } }
    ] }));
    const item = await getItem(PK, SK);
    if (!item) throw new HttpError(409, "Approval record unavailable after review");
    const { PK: _PK, SK: _SK, ...record } = item;
    return record;
  } catch (error) {
    if ((error as Error).name === "TransactionCanceledException") throw new HttpError(409, "Approval no longer pending, expired, or consent changed");
    throw error;
  }
}
