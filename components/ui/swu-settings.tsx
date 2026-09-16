"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAvailableModels } from "@/lib/services/ai/client";

export function SwuSettings() {
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [models, setModels] = useState<string[]>(["google/gemini-2.5-flash"]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("swu-api-key") || "";
      const savedId = localStorage.getItem("swu-user-id") || "";
      const savedModel = localStorage.getItem("swu-model") || "google/gemini-2.5-flash";
      setApiKey(savedKey);
      setUserId(savedId);
      setModel(savedModel);

      // Attempt to load models if credentials exist
      if (savedKey && savedId) {
        fetchModels(savedKey, savedId);
      }
    }
  }, []);

  async function fetchModels(keyToUse: string, idToUse: string) {
    if (!keyToUse || !idToUse) return;
    setLoading(true);
    try {
      const res = await getAvailableModels(keyToUse, idToUse);
      if (res.configured && Array.isArray(res.models)) {
        setModels(res.models);
        // If current model is not in the list, fallback to first model or gemini-2.5-flash
        if (!res.models.includes(model) && res.models.length > 0) {
          setModel(res.models[0]);
          localStorage.setItem("swu-model", res.models[0]);
        }
      } else if (res.configured && typeof res.models === "object" && res.models !== null) {
        // If API returns an object instead of array
        const modelList = Object.keys(res.models);
        if (modelList.length > 0) {
          setModels(modelList);
          if (!modelList.includes(model)) {
            setModel(modelList[0]);
            localStorage.setItem("swu-model", modelList[0]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (typeof window !== "undefined") {
      localStorage.setItem("swu-api-key", apiKey.trim());
      localStorage.setItem("swu-user-id", userId.trim());
      localStorage.setItem("swu-model", model.trim());
      toast.success("บันทึกการตั้งค่า SWU AI สำเร็จ");
      fetchModels(apiKey.trim(), userId.trim());
    }
  }

  return (
    <Card className="border border-sky-100 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-sky-600 animate-pulse" />
          ตั้งค่า SWU AI Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-500">
          ป้อนข้อมูล SWU API Key และ User ID ของคุณเพื่อเรียกใช้งานโมเดลภาษาขนาดใหญ่จริงผ่านเครือข่ายของมหาวิทยาลัย
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              SWU API Key (Token)
            </label>
            <Input
              type="password"
              placeholder="Bearer Token..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-sky-50/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              SWU User ID
            </label>
            <Input
              type="text"
              placeholder="e.g. gXXXXXX หรือ uXXXXXX"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-sky-50/30"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                AI Model
              </label>
              {(apiKey && userId) && (
                <button
                  type="button"
                  onClick={() => fetchModels(apiKey.trim(), userId.trim())}
                  disabled={loading}
                  className="text-xs text-sky-700 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  ดึงรายชื่อรุ่น
                </button>
              )}
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-11 rounded-xl border border-sky-100 bg-sky-50/30 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button className="w-full" size="sm" onClick={handleSave}>
          บันทึกการตั้งค่า
        </Button>
      </CardContent>
    </Card>
  );
}
