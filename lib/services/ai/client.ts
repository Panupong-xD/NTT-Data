"use client";

export async function askAI(content: string, files?: Array<{ type: string; name: string; data: string }>) {
  let apiKey = "";
  let userId = "";
  let model = "";

  if (typeof window !== "undefined") {
    apiKey = localStorage.getItem("swu-api-key") || process.env.NEXT_PUBLIC_SWU_API_KEY || "";
    userId = localStorage.getItem("swu-user-id") || process.env.NEXT_PUBLIC_SWU_USER_ID || "";
    model = localStorage.getItem("swu-model") || process.env.NEXT_PUBLIC_SWU_MODEL || "";
  }

  // Handle multimodal model fallback for vision tasks (e.g. food/device scanning)
  let targetModel = model || "openai/gpt-5.6-luna";
  if (files && files.length > 0) {
    const mLower = targetModel.toLowerCase();
    const isVisionSupported = 
      mLower.includes("gpt") ||
      mLower.includes("luna") ||
      mLower.includes("openai") ||
      mLower.includes("gemini") || 
      mLower.includes("claude");
      
    if (!isVisionSupported) {
      targetModel = "openai/gpt-5.6-luna";
    }
  }

  // 1. Try calling the SWU AI API directly from the browser (bypasses TLS fingerprint block if on campus/VPN)
  if (apiKey && userId) {
    try {
      const response = await fetch("https://swuai.swu.ac.th/swu/api/service/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          model: targetModel,
          content,
          files: files || []
        })
      });

      if (response.ok) {
        const payload = await response.json();
        const text =
          payload.choices?.[0]?.message?.content ||
          payload.content ||
          payload.message ||
          payload.response ||
          payload.answer ||
          payload.data?.content ||
          payload.data?.message ||
          payload.data?.response ||
          payload.data?.answer ||
          "";
        if (text) return text;
      }
    } catch (browserError) {
      console.warn("Direct browser fetch failed/CORS block, trying server-side proxy fallback:", browserError);
    }
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // 2. Fallback to server-side or AWS API Gateway route
  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, model: targetModel, apiKey, userId, files })
  });

  const payload = (await response.json()) as {
    text?: string;
    error?: string;
    configured?: boolean;
    model?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "AI request failed");
  }

  return payload.text || "";
}

export async function getAvailableModels(apiKey?: string, userId?: string) {
  const key = apiKey || (typeof window !== "undefined" ? localStorage.getItem("swu-api-key") || process.env.NEXT_PUBLIC_SWU_API_KEY || "" : "");
  const uid = userId || (typeof window !== "undefined" ? localStorage.getItem("swu-user-id") || process.env.NEXT_PUBLIC_SWU_USER_ID || "" : "");

  // 1. Try calling the SWU models endpoint directly from the browser
  if (key && uid) {
    try {
      const response = await fetch("https://swuai.swu.ac.th/swu/api/service/get-all-models", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_id: uid })
      });

      if (response.ok) {
        const models = await response.json();
        return { configured: true, models };
      }
    } catch (browserError) {
      console.warn("Direct browser models fetch failed, trying server-side proxy fallback:", browserError);
    }
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // 2. Fallback to server-side or AWS API Gateway route
  const response = await fetch(`${API_BASE_URL}/api/ai/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key, userId: uid })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Models request failed with status ${response.status}`);
  }

  return (await response.json()) as { configured: boolean; models: string[] | Record<string, unknown> };
}

export async function submitAgentAction(actionId: string, decision: "approved" | "rejected", note?: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  try {
    const response = await fetch(`${API_BASE_URL}/api/agent/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, decision, note, timestamp: new Date().toISOString() })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Agent action API call failed, fell back to local state:", error);
  }
  return { success: true, actionId, decision, local: true };
}
