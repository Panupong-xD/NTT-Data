export interface FoodAnalysis {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  sodium: string;
  score: string;
  recommendation: string;
}

// Model output is untrusted even when the prompt requests a JSON shape.
export function parseFoodAnalysis(answer: unknown): FoodAnalysis {
  const invalid = () => new Error("รูปแบบผลวิเคราะห์อาหารไม่ถูกต้อง กรุณาลองอีกครั้ง");
  if (typeof answer !== "string") throw invalid();
  const match = answer.trim().match(/\{[\s\S]*\}/);
  const parsed: unknown = JSON.parse(match?.[0] || answer);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw invalid();
  const data = parsed as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim()) throw invalid();
  const displayValue = (key: string): string => {
    const value = data[key];
    if (value === undefined || value === null || value === "") return "ไม่ระบุ";
    if (typeof value === "string") return value.trim() || "ไม่ระบุ";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    throw invalid();
  };
  let recommendation: string;
  if (typeof data.recommendation === "string" && data.recommendation.trim()) {
    recommendation = data.recommendation.trim();
  } else if (Array.isArray(data.recommendation) && data.recommendation.length > 0 &&
    data.recommendation.every(item => typeof item === "string" && item.trim())) {
    recommendation = data.recommendation.map(item => `- ${item.trim()}`).join("\n");
  } else {
    throw invalid();
  }
  return {
    name: data.name.trim(), calories: displayValue("calories"),
    protein: displayValue("protein"), carbs: displayValue("carbs"),
    fat: displayValue("fat"), sugar: displayValue("sugar"),
    sodium: displayValue("sodium"), score: displayValue("score"), recommendation
  };
}
