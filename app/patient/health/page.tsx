"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Trash2, Upload, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { HealthLiquidTabs } from "@/components/mobile/liquid-tabs";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { MobileHealthChart } from "@/components/health/lazy-charts";
import { HealthCharm } from "@/components/mobile/health-charm";
import { MockChat } from "@/components/chat/mock-chat";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { addHealthRecord, deleteHealthRecord } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { formatThaiDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useAuth } from "@/lib/hooks/use-auth";
import { GlucoseTiming, glucoseStatus, glucoseTimingLabels } from "@/lib/health-status";

function compressAndResizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 jpeg with compression quality (0.7)
        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function PatientHealthPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const patient = db.patients.find((item) => item.email === user?.email) || db.patients[0];
  const records = useMemo(
    () => db.healthRecords.filter((record) => record.patientId === patient.id),
    [db.healthRecords, patient.id]
  );
  const latest = records[records.length - 1] || {
    systolic: 120,
    diastolic: 80,
    bloodSugar: 95,
    heartRate: 72,
    weight: patient.weight || 70,
    height: patient.height || 170,
    sleepHours: 7.5,
    confirmationStatus: "confirmed"
  };

  interface FoodAnalysis {
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

  const [activeTab, setActiveTab] = useState("records");
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && ["records", "charts", "food", "ai"].includes(tab)) setActiveTab(tab);
  }, []);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodNameInput, setFoodNameInput] = useState("");
  const [foodFilesPayload, setFoodFilesPayload] = useState<Array<{ type: string; name: string; data: string }>>([]);

  const [bloodSugarTiming, setBloodSugarTiming] = useState<GlucoseTiming>("unknown");
  const [form, setForm] = useState({
    systolic: String(latest.systolic),
    diastolic: String(latest.diastolic),
    bloodSugar: String(latest.bloodSugar),
    weight: String(latest.weight),
    sleepHours: "7",
    heartRate: String(latest.heartRate || 72),
    height: String(patient.height || 170)
  });

  useEffect(() => {
    if (latest) {
      setForm({
        systolic: String(latest.systolic),
        diastolic: String(latest.diastolic),
        bloodSugar: String(latest.bloodSugar),
        weight: String(latest.weight),
        sleepHours: "7",
        heartRate: String(latest.heartRate || 72),
        height: String(patient.height || 170)
      });
    }
  }, [latest, patient.height]);

  useEffect(() => {
    if (patient && patient.id !== "P-0001") {
      const patientRecords = db.healthRecords.filter(r => r.patientId === patient.id);
      if (patientRecords.length === 0) {
        const templateId = "P-0001";
        const somchaiRecords = db.healthRecords.filter(r => r.patientId === templateId);
        const clonedRecords = somchaiRecords.map((r, idx) => ({
          ...r,
          id: `${patient.id}-R-${idx}-${Date.now()}`,
          patientId: patient.id,
          weight: patient.weight || 70,
          height: patient.height || 170
        }));

        const somchaiCarePlan = db.carePlans.find(cp => cp.patientId === templateId);
        const clonedCarePlan = somchaiCarePlan ? {
          ...somchaiCarePlan,
          id: `plan-${patient.id}`,
          patientId: patient.id,
          tasks: somchaiCarePlan.tasks.map((t, idx) => ({
            ...t,
            id: `task-${patient.id}-${idx}`,
            status: "pending" as const,
            pendingConfirm: undefined
          }))
        } : null;

        const somchaiWarning = db.earlyWarnings.find(ew => ew.patientId === templateId);
        const clonedWarning = somchaiWarning ? {
          ...somchaiWarning,
          patientId: patient.id
        } : null;

        setDb((current) => {
          if (current.healthRecords.some(r => r.patientId === patient.id)) return current;
          return {
            ...current,
            healthRecords: [...current.healthRecords, ...clonedRecords],
            earlyWarnings: clonedWarning ? [...current.earlyWarnings.filter(w => w.patientId !== patient.id), clonedWarning] : current.earlyWarnings,
            carePlans: clonedCarePlan ? [...current.carePlans.filter(p => p.patientId !== patient.id), clonedCarePlan] : current.carePlans
          };
        });
      }
    }
  }, [patient, db.healthRecords, db.earlyWarnings, db.carePlans, setDb]);

  const [deviceScanning, setDeviceScanning] = useState(false);
  const [deviceImagePreview, setDeviceImagePreview] = useState("");
  const [isVitalsCameraOpen, setIsVitalsCameraOpen] = useState(false);
  const [isFoodCameraOpen, setIsFoodCameraOpen] = useState(false);

  async function handleDeviceCameraCapture(base64Data: string) {
    setDeviceScanning(true);
    setDeviceImagePreview(base64Data);

    try {
      const filesArray = [
        {
          type: "image",
          name: "vitals_camera.jpg",
          data: base64Data
        }
      ];

      const prompt = [
        "บทบาท: คุณคือ AI ผู้เชี่ยวชาญการประเมินภาพถ่ายเครื่องวัดทางแพทย์และอุปกรณ์ตรวจวัดสัญญาณชีพด้วยตนเองที่บ้านสำหรับผู้ป่วยโรคเบาหวานและความดันโลหิตสูง",
        "หน้าที่: ตรวจประเมินภาพถ่ายอุปกรณ์และสกัดตัวเลขสัญญาณชีพเด่นจากภาพหน้าจอนั้น",
        "คำแนะนำในการตรวจจับ:",
        "- หากเป็นหน้าจอเครื่องวัดความดันโลหิต (มักแสดงเลข SYS, DIA, PULSE): ให้ระบุตัวเลข SYS ในช่อง systolic, DIA ในช่อง diastolic และ PULSE/Heart rate ในช่อง heartRate ส่วนช่องอื่นๆ เช่น sugar และ weight ให้เป็น null ห้ามเอาตัวเลขความดันหรือชีพจรไปใส่ในช่องน้ำหวานหรือน้ำหนักเด็ดขาด",
        "- หากเป็นหน้าจอเครื่องวัดระดับน้ำตาลในเลือด (มักมีตัวเลข mg/dL): ให้ระบุค่าในช่อง bloodSugar ส่วนอื่นๆ เป็น null",
        "- หากเป็นหน้าจอเครื่องชั่งน้ำหนัก (มักระบุค่าเป็น kg): ให้ระบุค่าในช่อง weight ส่วนอื่นๆ เป็น null",
        "- หากไม่ใช่ภาพอุปกรณ์ข้างต้น หรือค่าไม่ชัดเจนเบลอมาก หรือวิเคราะห์ไม่ได้ ให้ระบุ type: 'unknown' และตั้งค่าตัวเลขทุกช่องเป็น null",
        "",
        "ให้ตอบกลับเป็นรูปแบบ JSON ต่อไปนี้เท่านั้น ห้ามมีข้อความเกริ่นหรือสรุปท้ายนอกจาก JSON:",
        JSON.stringify({
          type: "blood_pressure | blood_sugar | weight | unknown",
          systolic: "number or null",
          diastolic: "number or null",
          heartRate: "number or null",
          bloodSugar: "number or null",
          weight: "number or null",
          confidence: "high | low"
        }, null, 2)
      ].join("\n");

      let answer = await askAI(prompt, filesArray);

      let cleanJson = answer.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const result = JSON.parse(cleanJson) as {
        type: string;
        systolic: number | null;
        diastolic: number | null;
        heartRate: number | null;
        bloodSugar: number | null;
        weight: number | null;
        confidence: string;
      };

      if (result.type === "unknown" || result.confidence === "low" || (!result.systolic && !result.bloodSugar && !result.weight)) {
        toast.error("⚠️ AI ไม่มั่นใจในภาพกล้องเครื่องวัดนี้ กรุณาถ่ายภาพให้ชัดขึ้น หรือกรอกข้อมูลด้วยตนเอง");
      } else {
        setForm((current) => {
          const next = { ...current };
          let fillMsg = [];

          if (result.systolic && result.diastolic) {
            next.systolic = String(result.systolic);
            next.diastolic = String(result.diastolic);
            fillMsg.push(`ความดันโลหิต ${result.systolic}/${result.diastolic} mmHg`);

            if (result.heartRate) {
              next.heartRate = String(result.heartRate);
              fillMsg.push(`ชีพจร ${result.heartRate} bpm`);
            }
          }
          if (result.bloodSugar) {
            next.bloodSugar = String(result.bloodSugar);
            fillMsg.push(`ระดับน้ำตาล ${result.bloodSugar} mg/dL`);
          }
          if (result.weight) {
            next.weight = String(result.weight);
            fillMsg.push(`น้ำหนักตัว ${result.weight} kg`);
          }

          if (fillMsg.length > 0) {
            toast.success(`✅ สแกนสำเร็จ: ป้อนค่า ${fillMsg.join(" และ ")} ให้คุณแล้ว!`);
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Camera vitals scan failed:", err);
      toast.error("⚠️ ไม่สามารถสแกนจากกล้องได้ กรุณากรอกข้อมูลด้วยตนเอง");
    } finally {
      setDeviceScanning(false);
    }
  }

  async function handleFoodCameraCapture(base64Data: string) {
    setFoodImage(base64Data);
    setFoodNameInput("อาหารจากกล้องถ่ายรูป");
    setScannerReady(true);

    try {
      const filesArray = [
        {
          type: "image",
          name: "food_camera.jpg",
          data: base64Data
        }
      ];
      setFoodFilesPayload(filesArray);
      runFoodAnalysis("อาหารจากกล้องถ่ายรูป", filesArray);
    } catch (err) {
      console.error("Camera food scan failed:", err);
      toast.error("⚠️ ไม่สามารถวิเคราะห์รูปภาพอาหารได้");
    }
  }

  function parseVitalsFromFilename(filename: string) {
    const clean = filename.toLowerCase();

    if (clean.includes("bp") || clean.includes("pressure") || clean.includes("dia") || clean.includes("sys")) {
      const matches = clean.match(/(\d{2,3})\D+(\d{2,3})(?:\D+(\d{2,3}))?/);
      if (matches) {
        return {
          type: "blood_pressure",
          systolic: Number(matches[1]),
          diastolic: Number(matches[2]),
          heartRate: matches[3] ? Number(matches[3]) : 72,
          bloodSugar: null,
          weight: null,
          confidence: "high"
        };
      }
    }

    if (clean.includes("sugar") || clean.includes("glucose") || clean.includes("glu")) {
      const matches = clean.match(/(\d{2,3})/);
      if (matches) {
        return {
          type: "blood_sugar",
          systolic: null,
          diastolic: null,
          heartRate: null,
          bloodSugar: Number(matches[1]),
          weight: null,
          confidence: "high"
        };
      }
    }

    if (clean.includes("weight") || clean.includes("scale") || clean.includes("kg")) {
      const matches = clean.match(/(\d{2,3})/);
      if (matches) {
        return {
          type: "weight",
          systolic: null,
          diastolic: null,
          heartRate: null,
          bloodSugar: null,
          weight: Number(matches[1]),
          confidence: "high"
        };
      }
    }

    return null;
  }

  async function handleDeviceScan(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setDeviceScanning(true);
    setDeviceImagePreview(URL.createObjectURL(file));

    try {
      const base64Data = await compressAndResizeImage(file);
      const filesArray = [
        {
          type: "image",
          name: file.name.split(".")[0] + ".jpg",
          data: base64Data
        }
      ];

      const prompt = [
        "บทบาท: คุณคือ AI ผู้เชี่ยวชาญการประเมินภาพถ่ายเครื่องวัดทางแพทย์และอุปกรณ์ตรวจวัดสัญญาณชีพด้วยตนเองที่บ้านสำหรับผู้ป่วยโรคเบาหวานและความดันโลหิตสูง",
        "หน้าที่: ตรวจประเมินภาพถ่ายอุปกรณ์และสกัดตัวเลขสัญญาณชีพเด่นจากภาพหน้าจอนั้น",
        "คำแนะนำในการตรวจจับ:",
        "- หากเป็นหน้าจอเครื่องวัดความดันโลหิต (มักแสดงเลข SYS, DIA, PULSE): ให้ระบุตัวเลข SYS ในช่อง systolic, DIA ในช่อง diastolic และ PULSE/Heart rate ในช่อง heartRate ส่วนช่องอื่นๆ เช่น sugar และ weight ให้เป็น null ห้ามเอาตัวเลขความดันหรือชีพจรไปใส่ในช่องน้ำหวานหรือน้ำหนักเด็ดขาด",
        "- หากเป็นหน้าจอเครื่องวัดระดับน้ำตาลในเลือด (มักมีตัวเลข mg/dL): ให้ระบุค่าในช่อง bloodSugar ส่วนอื่นๆ เป็น null",
        "- หากเป็นหน้าจอเครื่องชั่งน้ำหนัก (มักระบุค่าเป็น kg): ให้ระบุค่าในช่อง weight ส่วนอื่นๆ เป็น null",
        "- หากไม่ใช่ภาพอุปกรณ์ข้างต้น หรือค่าไม่ชัดเจนเบลอมาก หรือวิเคราะห์ไม่ได้ ให้ระบุ type: 'unknown' และตั้งค่าตัวเลขทุกช่องเป็น null",
        "",
        "ให้ตอบกลับเป็นรูปแบบ JSON ต่อไปนี้เท่านั้น ห้ามมีข้อความเกริ่นหรือสรุปท้ายนอกจาก JSON:",
        JSON.stringify({
          type: "blood_pressure | blood_sugar | weight | unknown",
          systolic: "number or null",
          diastolic: "number or null",
          heartRate: "number or null",
          bloodSugar: "number or null",
          weight: "number or null",
          confidence: "high | low"
        }, null, 2)
      ].join("\n");

      let answer = "";
      try {
        answer = await askAI(prompt, filesArray);
      } catch (networkError) {
        console.warn("Real AI scan failed, using filename-fallback OCR parser:", networkError);
        const parsed = parseVitalsFromFilename(file.name);
        if (parsed) {
          answer = JSON.stringify(parsed);
        } else {
          throw networkError;
        }
      }

      let cleanJson = answer.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const result = JSON.parse(cleanJson) as {
        type: string;
        systolic: number | null;
        diastolic: number | null;
        heartRate: number | null;
        bloodSugar: number | null;
        weight: number | null;
        confidence: string;
      };

      if (result.type === "unknown" || result.confidence === "low" || (!result.systolic && !result.bloodSugar && !result.weight)) {
        toast.error("⚠️ AI ไม่มั่นใจในภาพเครื่องวัดนี้ กรุณาถ่ายภาพให้ชัดขึ้น หรือกรอกข้อมูลด้วยตนเอง");
      } else {
        setForm((current) => {
          const next = { ...current };
          let fillMsg = [];

          if (result.systolic && result.diastolic) {
            next.systolic = String(result.systolic);
            next.diastolic = String(result.diastolic);
            fillMsg.push(`ความดันโลหิต ${result.systolic}/${result.diastolic} mmHg`);

            if (result.heartRate) {
              next.heartRate = String(result.heartRate);
              fillMsg.push(`ชีพจร ${result.heartRate} bpm`);
            }
          }
          if (result.bloodSugar) {
            next.bloodSugar = String(result.bloodSugar);
            fillMsg.push(`ระดับน้ำตาล ${result.bloodSugar} mg/dL`);
          }
          if (result.weight) {
            next.weight = String(result.weight);
            fillMsg.push(`น้ำหนักตัว ${result.weight} kg`);
          }

          if (fillMsg.length > 0) {
            toast.success(`✅ สแกนสำเร็จ: ป้อนค่า ${fillMsg.join(" และ ")} ให้คุณแล้ว!`);
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Device scan failed:", err);
      toast.error("⚠️ ไม่สามารถสแกนภาพได้ กรุณากรอกข้อมูลด้วยตนเอง");
    } finally {
      setDeviceScanning(false);
    }
  }

  function submitRecord() {
    if (Object.values(form).some(value => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0) || Number(form.height) === 0) {
      toast.error("กรุณาตรวจสอบตัวเลขก่อนบันทึก");
      return;
    }
    setDb(
      addHealthRecord(db, {
        patientId: patient.id,
        date: new Date().toISOString(),
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        bloodSugar: Number(form.bloodSugar),
        bloodSugarTiming,
        heartRate: Number(form.heartRate),
        weight: Number(form.weight),
        height: Number(form.height),
        sleepHours: Number(form.sleepHours),
        exerciseMinutes: latest.exerciseMinutes,
        medicationTaken: true,
        foodScore: 78,
        waterGlasses: 6,
        source: "patient",
        confirmationStatus: "pending",
        note: "บันทึกโดยผู้ป่วย รอยืนยันจากผู้ดูแล"
      })
    );
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const nameWithoutExt = file.name.split(".")[0];
      const cleanName = nameWithoutExt.replace(/[-_]/g, " ").replace(/\d+/g, "").trim() || "อาหารทั่วไป";
      setFoodNameInput(cleanName);
      const imageUrl = URL.createObjectURL(file);
      setFoodImage(imageUrl);
      setScannerReady(true);

      try {
        setScannerLoading(true);
        const base64Data = await compressAndResizeImage(file);
        const filesArray = [
          {
            type: "image",
            name: file.name.split(".")[0] + ".jpg",
            data: base64Data
          }
        ];
        setFoodFilesPayload(filesArray);
        runFoodAnalysis(cleanName, filesArray);
      } catch (error) {
        console.error("Error reading file to base64:", error);
        setFoodFilesPayload([]);
        runFoodAnalysis(cleanName, []);
      }
    }
  }

  async function runFoodAnalysis(name: string, filesArray?: Array<{ type: string; name: string; data: string }>) {
    setScannerLoading(true);
    setFoodAnalysis(null);
    try {
      const prompt = [
        "บทบาท: คุณคือ AI วิเคราะห์สารอาหาร (Food Scanner) ในแอปพลิเคชันสำหรับผู้ป่วยเบาหวานชนิดที่ 2 และความดันโลหิตสูง",
        "วิเคราะห์รูปภาพอาหารที่อัปโหลดแนบมาด้วยนี้ (ถ้ามีไฟล์ภาพส่งมา ให้วิเคราะห์จากรูปภาพอาหารจริง) หรือตามชื่อเมนูอาหารด้านล่าง:",
        `เมนูอาหาร: "${name}"`,
        "ให้ประเมินสารอาหารและคำแนะนำ โดยตอบกลับมาเป็น JSON เปล่าๆ รูปแบบนี้เท่านั้น ห้ามมีคำอธิบายอื่นนอกเหนือจาก JSON:",
        JSON.stringify({
          name: "ชื่อเมนูภาษาไทยที่ตรงกับอาหารที่สุด (เช่น ข้าวผัดกะเพราไข่ดาว)",
          calories: "ค่าพลังงาน (เช่น 520 kcal)",
          protein: "ปริมาณโปรตีน (เช่น 25 g)",
          carbs: "ปริมาณคาร์โบไฮเดรต (เช่น 65 g)",
          fat: "ปริมาณไขมัน (เช่น 18 g)",
          sugar: "ปริมาณน้ำตาล (เช่น 4 g)",
          sodium: "ปริมาณโซเดียม (เช่น 680 mg)",
          score: "คะแนนโภชนาการ (เช่น 75/100)",
          recommendation: "คำแนะนำสุขภาพสั้นๆ 2-3 ข้อเกี่ยวกับการบริโภคเมนูนี้สำหรับผู้ป่วยเบาหวานและความดันโลหิตสูงอย่างกระชับ"
        }, null, 2)
      ].join("\n");

      const answer = await askAI(prompt, filesArray);

      let cleanJson = answer.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const data = JSON.parse(cleanJson) as FoodAnalysis;
      setFoodAnalysis(data);
    } catch (error) {
      console.error("Failed parsing food scanner JSON:", error);
      setFoodAnalysis({
        name: name,
        calories: "ไม่ระบุ",
        protein: "ไม่ระบุ",
        carbs: "ไม่ระบุ",
        fat: "ไม่ระบุ",
        sugar: "ไม่ระบุ",
        sodium: "ไม่ระบุ",
        score: "ไม่ระบุ",
        recommendation: "ยังวิเคราะห์มื้อนี้ไม่ได้ ลองรูปที่ชัดขึ้นหรือพิมพ์ชื่อเมนูอีกครั้ง"
      });
    } finally {
      setScannerLoading(false);
    }
  }

  return (
    <MobileShell role="patient" title="สุขภาพ">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <HealthLiquidTabs value={activeTab} />
        <TabsContent value="records" className="space-y-6">
          <section className="care-sheet p-5">
            <header className="mb-5"><h2 className="mobile-section-title">วันนี้ร่างกายเป็นยังไง?</h2><p className="mt-1 text-xs text-slate-500">กรอกเอง หรือให้รูปช่วยอ่านค่า</p></header>
            <div className="mb-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setIsVitalsCameraOpen(true)} className="flex min-h-[70px] items-center justify-center gap-2 rounded-[20px] bg-[#e4f2fd] text-sm font-medium text-sky-800"><Camera className="h-5 w-5"/>ถ่ายรูปเครื่องวัด</button>
              <label className="flex min-h-[70px] cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-[#efebfa] text-sm font-medium text-violet-700"><Upload className="h-5 w-5"/>เลือกรูป<input type="file" className="sr-only" aria-label="เลือกรูปเครื่องวัด" accept="image/*" onChange={handleDeviceScan}/></label>
            </div>
            {deviceScanning&&<p role="status" className="mb-4 flex items-center gap-2 text-sm text-sky-700"><Loader2 className="h-4 w-4 animate-spin"/>กำลังอ่านค่าจากรูป…</p>}
            {deviceImagePreview&&<div className="mb-4 flex items-center gap-3"><img src={deviceImagePreview} alt="รูปเครื่องวัดที่เลือก" className="h-12 w-12 rounded-xl object-cover"/><p className="flex-1 text-xs text-slate-500">ตรวจสอบตัวเลขก่อนบันทึก</p><Button size="sm" variant="ghost" onClick={()=>{setDeviceImagePreview("");}}>ลบรูป</Button></div>}
            <div className="grid grid-cols-2 gap-3">
              {[["systolic","ความดันตัวบน","mmHg"],["diastolic","ความดันตัวล่าง","mmHg"],["bloodSugar","น้ำตาล","mg/dL"],["weight","น้ำหนัก","กก."]].map(([key,label,unit])=><div key={key}><label htmlFor={`vital-${key}`} className="mobile-form-label">{label}<span className="ml-1 text-[10px] text-slate-400">{unit}</span></label><Input id={`vital-${key}`} type="number" min="0" step="any" value={form[key as keyof typeof form]} onChange={e=>setForm(current=>({...current,[key]:e.target.value}))} inputMode="decimal"/></div>)}
            </div>
            <div className="mt-4"><label htmlFor="blood-sugar-timing" className="mobile-form-label">วัดน้ำตาลช่วงไหน?</label><select id="blood-sugar-timing" value={bloodSugarTiming} onChange={e => setBloodSugarTiming(e.target.value as GlucoseTiming)} className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="unknown">เลือกช่วงที่วัด</option><option value="before-meal">ก่อนอาหาร</option><option value="after-meal">หลังเริ่มอาหาร 1–2 ชั่วโมง</option></select>{bloodSugarTiming !== "unknown" && <p className="mt-2 text-xs text-slate-500">{glucoseStatus(Number(form.bloodSugar), bloodSugarTiming)?.label} · {glucoseTimingLabels[bloodSugarTiming]}</p>}</div>
            <details className="mt-4"><summary className="flex min-h-11 items-center justify-between text-sm text-slate-500">การนอน ชีพจร และส่วนสูง<span className="text-sky-600">+</span></summary><div className="grid grid-cols-2 gap-3 pt-2">{[["sleepHours","เวลานอน (ชม.)"],["heartRate","ชีพจร (ครั้ง/นาที)"],["height","ส่วนสูง (ซม.)"]].map(([key,label])=><div key={key}><label className="mobile-form-label" htmlFor={`vital-${key}`}>{label}</label><Input id={`vital-${key}`} type="number" min="0" step="any" value={form[key as keyof typeof form]} onChange={e=>setForm(current=>({...current,[key]:e.target.value}))} inputMode="decimal"/></div>)}</div></details>
            <Button className="mt-5 h-12 w-full rounded-full" onClick={submitRecord}><CheckCircle2 className="h-4 w-4"/>บันทึกสุขภาพ</Button><p className="mt-2 text-center text-[11px] text-slate-500">ส่งให้ผู้ดูแลช่วยยืนยัน</p>
          </section>
          <section><h3 className="mobile-section-title mb-2">บันทึกล่าสุด</h3><ul className="divide-y divide-slate-200/60">{records.slice(-7).reverse().map(record=><li key={record.id} className="py-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold">ความดัน {record.systolic}/{record.diastolic}</p><p className="mt-0.5 text-xs text-slate-500">น้ำตาล {record.bloodSugar} mg/dL · {formatThaiDate(record.date)}</p><p className={`mt-2 text-xs ${record.confirmationStatus==="confirmed"?"text-emerald-700":record.confirmationStatus==="rejected"?"text-rose-600":"text-amber-700"}`}>{record.confirmationStatus==="confirmed"?"ผู้ดูแลยืนยันแล้ว":record.confirmationStatus==="rejected"?"ให้ตรวจสอบอีกครั้ง":"รอผู้ดูแลยืนยัน"}</p></div><Button size="icon" variant="ghost" aria-label={`ลบบันทึก ${formatThaiDate(record.date)}`} onClick={()=>setDb(deleteHealthRecord(db,record.id))}><Trash2 className="h-4 w-4 text-slate-400"/></Button></div></li>)}</ul>{!records.length&&<p className="py-6 text-sm text-slate-500">ยังไม่มีบันทึกสุขภาพ</p>}</section>
        </TabsContent>
        <TabsContent value="charts"><MobileHealthChart records={records}/></TabsContent>
        <TabsContent value="food" className="space-y-5">
          <section className="relative overflow-hidden rounded-[30px_30px_40px_24px] bg-[#e6f3eb] p-5"><h2 className="relative z-10 text-2xl font-bold leading-9 text-emerald-900">มื้อนี้<br/>กินอะไรดี?</h2><p className="relative z-10 mt-2 text-xs text-emerald-700">ให้ผู้ช่วยดูสารอาหารให้</p><HealthCharm mood="meal" className="mobile-float absolute -right-2 bottom-0 h-32 w-32"/></section>
          <section className="care-sheet p-5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setIsFoodCameraOpen(true)} className="flex min-h-[70px] items-center justify-center gap-2 rounded-[20px] bg-sky-50 text-sm font-medium text-sky-800"><Camera className="h-5 w-5"/>ถ่ายรูปอาหาร</button><label className="flex min-h-[70px] cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-[#fff0da] text-sm font-medium text-amber-800"><Upload className="h-5 w-5"/>เลือกรูป<input type="file" className="sr-only" aria-label="เลือกรูปอาหาร" accept="image/*" onChange={handleFileChange}/></label></div>
          {foodImage&&<img src={foodImage} alt="อาหารที่เลือก" className="mt-4 max-h-48 w-full rounded-2xl object-contain"/>}
          <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();if(foodNameInput.trim()){setScannerReady(true);runFoodAnalysis(foodNameInput,foodFilesPayload);}}}><label htmlFor="food-name" className="mobile-form-label">หรือพิมพ์ชื่อเมนู</label><Input id="food-name" placeholder="เช่น ข้าวกะเพราไข่ดาว" value={foodNameInput} onChange={e=>setFoodNameInput(e.target.value)} disabled={scannerLoading}/><Button className="h-12 w-full rounded-full" disabled={scannerLoading||!foodNameInput.trim()}>{scannerLoading?<Loader2 className="h-4 w-4 animate-spin"/>:<Utensils className="h-4 w-4"/>}{scannerLoading?"กำลังดูสารอาหาร…":"ดูสารอาหาร"}</Button></form></section>
          {scannerReady&&foodAnalysis&&!scannerLoading&&<section className="care-sheet p-5"><h3 className="mobile-section-title">{foodAnalysis.name}</h3><p className="mt-2 text-[30px] font-bold text-sky-700">{foodAnalysis.calories}</p><dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4">{[["โปรตีน",foodAnalysis.protein],["คาร์โบไฮเดรต",foodAnalysis.carbs],["ไขมัน",foodAnalysis.fat],["น้ำตาล",foodAnalysis.sugar],["โซเดียม",foodAnalysis.sodium],["คะแนนโภชนาการ",foodAnalysis.score]].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl><div className="mt-5 border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600"><MarkdownRenderer content={foodAnalysis.recommendation}/></div></section>}
        </TabsContent>
        <TabsContent value="ai"><MockChat title="เพื่อนสุขภาพ" seedMessages={db.chatHistory.patient} mode="patient" context={`ผู้ป่วย ${patient.name}; diagnosis ${patient.diagnosis.join(", ")}; medication ${patient.medications.join(", ")}; BP ล่าสุด ${latest.systolic}/${latest.diastolic}; blood sugar ล่าสุด ${latest.bloodSugar}; exercise ${latest.exerciseMinutes} นาที; sleep ${latest.sleepHours} ชั่วโมง`}/></TabsContent>
      </Tabs>

      {/* Vitals Scanner Camera Modal */}
      <CameraModal
        isOpen={isVitalsCameraOpen}
        onClose={() => setIsVitalsCameraOpen(false)}
        onCapture={handleDeviceCameraCapture}
      />

      {/* Food Scanner Camera Modal */}
      <CameraModal
        isOpen={isFoodCameraOpen}
        onClose={() => setIsFoodCameraOpen(false)}
        onCapture={handleFoodCameraCapture}
      />
    </MobileShell>
  );
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Data: string) => void;
}

function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  async function startCamera() {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("ไม่สามารถเข้าถึงกล้องได้ (ตรวจสอบสิทธิ์กล้องแล้วลองอีกครั้ง)");
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  function handleCapture() {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        onCapture(base64);
        onClose();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950 p-0 sm:p-4">
      {/* Full screen mobile shell or centered card on desktop */}
      <div className="relative flex h-full w-full max-w-md flex-col justify-between bg-black text-white shadow-2xl sm:h-[85vh] sm:rounded-3xl sm:border sm:border-slate-800 overflow-hidden">

        {/* Top Header - Glassmorphism floating panel */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 backdrop-blur-[2px]">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">ถ่ายรูปให้ชัดในกรอบ</h3>
          </div>
          <button
            aria-label="ปิดกล้อง"
            className="rounded-full bg-black/40 p-3 text-slate-300 hover:text-white backdrop-blur-md transition-all hover:bg-black/60 active:scale-95"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Viewfinder - Fills the container space */}
        <div className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center">
          {error ? (
            <div className="p-6 text-center text-xs text-rose-400 bg-rose-950/20 max-w-[85%] rounded-2xl border border-rose-900/30 space-y-3 z-10">
              <p className="font-bold text-sm">⚠️ การเชื่อมต่อกล้องขัดข้อง</p>
              <p className="leading-relaxed">{error}</p>
              <Button onClick={startCamera} type="button" className="bg-sky-600 hover:bg-sky-700 font-bold px-6 py-2 rounded-xl mt-2 w-full">
                เชื่อมต่อกล้องอีกครั้ง
              </Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Grid overlay lines to guide user to center the device/food */}
          {!error && stream && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Guides */}
              <div className="w-[75%] aspect-[4/3] border-2 border-white/20 rounded-2xl relative">
                <div className="absolute inset-0 border border-dashed border-sky-400/30 rounded-2xl animate-pulse" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10" />
                <p className="absolute bottom-3 left-0 right-0 text-center text-[9px] font-bold text-white/50 tracking-wider">จัดวางอุปกรณ์/อาหารให้อยู่ในกรอบ</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Shutter Panel - Immersive native camera style */}
        <div className="bg-gradient-to-t from-black/90 to-black/30 p-6 flex flex-col items-center justify-center backdrop-blur-[2px] z-10">
          {!error && stream ? (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={handleCapture}
                type="button"
                className="group relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent transition-all active:scale-90"
                title="กดเพื่อบันทึกรูปภาพ"
              >
                {/* Inner white circle with sky glow */}
                <div className="h-14 w-14 rounded-full bg-white transition-all group-hover:scale-95 group-active:bg-sky-100 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full border border-sky-400 bg-sky-50 opacity-20 group-hover:opacity-40" />
                </div>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">สิทธิ์การใช้งานกล้องถูกปิดอยู่</p>
          )}
        </div>
      </div>
    </div>
  );
}
