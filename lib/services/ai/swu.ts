import { gotScraping } from "got-scraping";

const SWU_BASE_URL = "https://swuai.swu.ac.th";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface SwuChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  content?: string;
  message?: string;
  response?: string;
  answer?: string;
  data?: {
    content?: string;
    message?: string;
    response?: string;
    answer?: string;
  };
}

function getSwuConfig() {
  return {
    apiKey: process.env.SWU_API_KEY,
    userId: process.env.SWU_USER_ID,
    model: process.env.SWU_MODEL || DEFAULT_MODEL
  };
}

export function isSwuConfigured(apiKey?: string, userId?: string) {
  const config = getSwuConfig();
  return Boolean((apiKey || config.apiKey) && (userId || config.userId));
}

function extractText(payload: SwuChatResponse) {
  return (
    payload.choices?.[0]?.message?.content ||
    payload.content ||
    payload.message ||
    payload.response ||
    payload.answer ||
    payload.data?.content ||
    payload.data?.message ||
    payload.data?.response ||
    payload.data?.answer ||
    ""
  );
}

export async function getSwuModels(apiKey?: string, userId?: string) {
  const config = getSwuConfig();
  const key = apiKey || config.apiKey;
  const uid = userId || config.userId;

  if (!key || !uid) {
    return { configured: false, models: [] };
  }

  try {
    const response = await gotScraping({
      url: `${SWU_BASE_URL}/swu/api/service/get-all-models`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`
      },
      json: { user_id: uid },
      responseType: "json",
      http2: false // Force HTTP/1.1 to prevent stream abort/protocol compatibility issues
    });

    const data = response.body as { models?: Array<{ name: string } | string> };
    const modelNames = Array.isArray(data.models)
      ? data.models.map((m) => (typeof m === "object" && m !== null ? m.name : String(m)))
      : [];

    return { configured: true, models: modelNames };
  } catch (error) {
    const err = error as any;
    if (err.response && err.response.statusCode === 403) {
      throw new Error("ติดระบบป้องกันของ Cloudflare (403) - กรุณาเชื่อมต่อ SWU VPN หรือตรวจสอบความถูกต้องของสิทธิ์การเข้าถึง");
    }
    throw new Error(`SWU models request failed: ${err.message}`);
  }
}

export async function chatWithSwuAI(
  content: string,
  model?: string,
  apiKey?: string,
  userId?: string,
  files?: Array<{ type: string; name: string; data: string }>
) {
  const config = getSwuConfig();
  const key = apiKey || config.apiKey;
  const uid = userId || config.userId;
  const targetModel = model || config.model;

  if (!key || !uid) {
    throw new Error("SWU AI is not configured. Set SWU_API_KEY and SWU_USER_ID in settings or .env.local.");
  }

  try {
    const response = await gotScraping({
      url: `${SWU_BASE_URL}/swu/api/service/chat`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`
      },
      json: {
        user_id: uid,
        model: targetModel,
        content,
        files: files || []
      },
      responseType: "json",
      http2: false // Force HTTP/1.1 to prevent stream abort/protocol compatibility issues
    });

    const payload = response.body as SwuChatResponse;
    const text = extractText(payload);
    
    // Check if Cloudflare challenged the request
    const rawString = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
    if (isHtmlOrCloudflare(rawString) || isHtmlOrCloudflare(text)) {
      throw new Error("ติดด่านป้องกัน Cloudflare (403/503 Just a Moment) ของเซิร์ฟเวอร์มหาวิทยาลัย (กรุณาเชื่อมต่อ SWU VPN หรือตรวจสอบสิทธิ์การเข้าถึง หากใช้ Vercel แนะนำให้ทดสอบรันแบบ Local บนคอมพิวเตอร์ของคุณแทน เพื่อเลี่ยงการบล็อกไอพีโฮสติ้งของ Vercel)");
    }
    
    return {
      configured: true,
      model: targetModel,
      text: text || JSON.stringify(payload)
    };
  } catch (error) {
    const err = error as any;
    
    // Check if it is a real Cloudflare HTML block (which contains HTML tags)
    const errBody = err.response?.body;
    const isHtmlBlock = typeof errBody === "string" && isHtmlOrCloudflare(errBody);
    
    if (
      isHtmlBlock || 
      err.message?.includes("ติดด่านป้องกัน Cloudflare") ||
      (err.message && (err.message.includes("503") || err.message.includes("502")))
    ) {
      throw new Error("ติดด่านป้องกัน Cloudflare (403/503 Just a Moment) ของเซิร์ฟเวอร์มหาวิทยาลัย (กรุณาเชื่อมต่อ SWU VPN หรือตรวจสอบสิทธิ์การเข้าถึง หากใช้ Vercel แนะนำให้ทดสอบรันแบบ Local บนคอมพิวเตอร์ของคุณแทน เพื่อเลี่ยงการบล็อกไอพีโฮสติ้งของ Vercel)");
    }
    
    // If it is a real SWU AI error returned as JSON (such as 403 Forbidden with details)
    if (err.response) {
      const statusCode = err.response.statusCode;
      const bodyData = err.response.body;
      
      if (bodyData && typeof bodyData === "object") {
        if (bodyData.detail) {
          throw new Error(`SWU AI (Error ${statusCode}): ${bodyData.detail}`);
        }
        if (bodyData.error) {
          throw new Error(`SWU AI (Error ${statusCode}): ${bodyData.error}`);
        }
      }
      
      throw new Error(`SWU chat request failed: ${statusCode} ${JSON.stringify(bodyData)}`);
    }
    throw new Error(`SWU chat request failed: ${err.message}`);
  }
}

function isHtmlOrCloudflare(text: string): boolean {
  if (typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("<!doctype html>") ||
    lower.includes("<html") ||
    lower.includes("just a moment...") ||
    lower.includes("cloudflare") ||
    lower.includes("challenge") ||
    lower.includes("noscript")
  );
}
