"use client";

import { useEffect, useState } from "react";
import { Cloud, Cpu, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAvailableModels } from "@/lib/services/ai/client";

export function BedrockSettings() {
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [model, setModel] = useState("amazon.nova-micro-v1:0");
  const [models, setModels] = useState<Array<{ id: string; name: string; tier: string }>>([
    { id: "amazon.nova-micro-v1:0", name: "Amazon Nova Micro (Cost-Optimized / Default)", tier: "standard" },
    { id: "anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude 3.5 Haiku (Fast & Precise)", tier: "standard" },
    { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", name: "Claude 3.5 Sonnet (Critical Case Reasoning)", tier: "critical" },
    { id: "amazon.titan-text-express-v1", name: "Amazon Titan Text Express", tier: "standard" }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEndpoint = localStorage.getItem("bedrock-api-endpoint") || process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const savedRegion = localStorage.getItem("bedrock-region") || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
      const savedModel = localStorage.getItem("bedrock-model") || "amazon.nova-micro-v1:0";

      setApiEndpoint(savedEndpoint);
      setRegion(savedRegion);
      setModel(savedModel);

      fetchModels();
    }
  }, []);

  async function fetchModels() {
    setLoading(true);
    try {
      const res = await getAvailableModels();
      if (res && Array.isArray(res.models)) {
        setModels(res.models);
      }
    } catch (err) {
      console.warn("Bedrock models fallback:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (typeof window !== "undefined") {
      localStorage.setItem("bedrock-api-endpoint", apiEndpoint.trim());
      localStorage.setItem("bedrock-region", region.trim());
      localStorage.setItem("bedrock-model", model.trim());
      toast.success("บันทึกการตั้งค่า Amazon Bedrock เรียบร้อยแล้ว");
    }
  }

  return (
    <Card className="border border-sky-100 shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Cpu className="h-5 w-5 text-sky-600" />
            ตั้งค่า Amazon Bedrock & AWS Serverless
          </CardTitle>
          <Badge tone="green" className="text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1" />
            AWS Native
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="leading-relaxed text-slate-500">
          เชื่อมต่อระบบเข้ากับ Amazon Bedrock (Nova Micro / Claude 3.5 Haiku) และ Amazon DynamoDB ผ่าน AWS API Gateway
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
              AWS API Gateway Base URL
            </label>
            <Input
              type="text"
              placeholder="e.g. https://xxx.execute-api.us-east-1.amazonaws.com"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
              AWS Region
            </label>
            <Input
              type="text"
              placeholder="e.g. us-east-1 หรือ ap-southeast-1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-400" />
                Amazon Bedrock Model
              </label>
              <button
                type="button"
                onClick={fetchModels}
                disabled={loading}
                className="text-xs text-sky-700 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id} {m.tier === "critical" ? "⚠️ (Critical Tier)" : "⚡ ($0 Low Cost)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-2 font-bold">
          บันทึกการตั้งค่า AWS Bedrock
        </Button>
      </CardContent>
    </Card>
  );
}


