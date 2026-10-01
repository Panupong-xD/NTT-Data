import { handleChat } from "./chatHandler.js";
import { handleGetApprovals, handleApprovalDecision, handleCreateApproval } from "./approvalHandler.js";

export interface APIGatewayEvent {
  httpMethod?: string;
  requestContext?: {
    http?: {
      method: string;
      path: string;
    };
  };
  path?: string;
  rawPath?: string;
  queryStringParameters?: Record<string, string>;
  body?: string | null;
  headers?: Record<string, string>;
  isBase64Encoded?: boolean;
}

export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Universal CORS Headers for S3 / CloudFront Static Frontend
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Content-Type": "application/json"
};

function buildResponse(statusCode: number, data: unknown): APIGatewayResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

/**
 * Main AWS Lambda Entrypoint (Node.js 20.x runtime)
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const method = (event.httpMethod || event.requestContext?.http?.method || "GET").toUpperCase();
  const path = event.path || event.rawPath || "/";

  console.log(`[Lambda Request] ${method} ${path}`);

  // 1. CORS Preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  try {
    // Parse JSON body safely
    let body: any = {};
    if (event.body) {
      const rawString = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;
      try {
        body = JSON.parse(rawString);
      } catch (err) {
        body = {};
      }
    }

    // 2. Health Check
    if (path === "/" || path === "/health" || path === "/api/health") {
      return buildResponse(200, {
        status: "healthy",
        service: "Wellync AWS Native Stack",
        stack: {
          compute: "AWS Lambda (Node.js 20.x)",
          database: "Amazon DynamoDB (Single-Table Design: HealthcareAgentTable)",
          ai: "Amazon Bedrock (Nova Micro / Claude 3.5 Haiku & Sonnet)",
          frontend: "Amazon S3 + CloudFront (Static Export)"
        },
        costModel: "Pure Serverless ($0 Base Cost)"
      });
    }

    // 3. AI Chat Endpoint with Sliding Window & Rolling DynamoDB Summary
    if (path.endsWith("/api/ai/chat") && method === "POST") {
      if (!body.content?.trim()) {
        return buildResponse(400, { error: "content is required" });
      }
      const chatResult = await handleChat(body);
      return buildResponse(200, chatResult);
    }

    // 4. Human-in-the-Loop Approvals List (GET /api/approvals)
    if (path.endsWith("/api/approvals") && method === "GET") {
      const result = await handleGetApprovals(event.queryStringParameters);
      return buildResponse(200, result);
    }

    // 5. Human-in-the-Loop Approval Decision (POST /api/approvals or /api/approvals/:id or /api/agent/action)
    if ((path.includes("/api/approvals") || path.endsWith("/api/agent/action")) && method === "POST") {
      // Check if actionId is part of URL or body
      const urlParts = path.split("/");
      const lastPart = urlParts[urlParts.length - 1];
      const actionId = body.actionId || (lastPart !== "approvals" && lastPart !== "action" ? lastPart : undefined);

      if (body.actionId && !body.decision) {
        // Maybe creation request
        const createRes = await handleCreateApproval(body);
        return buildResponse(201, createRes);
      }

      const decisionPayload = {
        actionId: actionId || body.actionId,
        decision: (body.decision || "APPROVED").toUpperCase() as "APPROVED" | "REJECTED",
        doctorId: body.doctorId || "DOC-001",
        note: body.note
      };

      const result = await handleApprovalDecision(decisionPayload);
      return buildResponse(200, result);
    }

    // 6. Available Models List Endpoint
    if (path.endsWith("/api/ai/models")) {
      return buildResponse(200, {
        provider: "Amazon Bedrock",
        models: [
          { id: "amazon.nova-micro-v1:0", name: "Amazon Nova Micro (Cost-Optimized / Default)", tier: "standard" },
          { id: "anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude 3.5 Haiku (Fast & Precise)", tier: "standard" },
          { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", name: "Claude 3.5 Sonnet (Critical Case Reasoning)", tier: "critical" },
          { id: "amazon.titan-text-express-v1", name: "Amazon Titan Text Express", tier: "standard" }
        ]
      });
    }

    // Route Not Found
    return buildResponse(404, {
      error: "Not Found",
      path,
      method
    });
  } catch (error: any) {
    console.error("[Lambda Global Error]:", error);
    return buildResponse(500, {
      error: error?.message || "Internal Server Error"
    });
  }
}
