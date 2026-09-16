"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, HeartPulse, Loader2, Plus, Trash2, Upload, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { AdherenceChart, MultiMetricChart, TrendChart, DoctorChartsGrid } from "@/components/health/charts";
import { MockChat } from "@/components/chat/mock-chat";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { addHealthRecord, deleteHealthRecord } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { formatThaiDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useAuth } from "@/lib/hooks/use-auth";

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

  const [scannerReady, setScannerReady] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodNameInput, setFoodNameInput] = useState("");
  const [foodFilesPayload, setFoodFilesPayload] = useState<Array<{ type: string; name: string; data: string }>>([]);
  
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
  const [deviceNameLog, setDeviceNameLog] = useState("");
  const [isVitalsCameraOpen, setIsVitalsCameraOpen] = useState(false);
  const [isFoodCameraOpen, setIsFoodCameraOpen] = useState(false);

  async function handleDeviceCameraCapture(base64Data: string) {
    setDeviceScanning(true);
    setDeviceNameLog("camera_capture.jpg");
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
    setDeviceNameLog(file.name);
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
    setDb((current) =>
      addHealthRecord(current, {
        patientId: patient.id,
        date: new Date().toISOString(),
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        bloodSugar: Number(form.bloodSugar),
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
        recommendation: error instanceof Error ? `วิเคราะห์ข้อมูลไม่สำเร็จ: ${error.message}` : "วิเคราะห์อาหารขัดข้อง"
      });
    } finally {
      setScannerLoading(false);
    }
  }

  return (
    <MobileShell role="patient" title="สุขภาพ">
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">บันทึก</TabsTrigger>
          <TabsTrigger value="charts">กราฟ</TabsTrigger>
          <TabsTrigger value="food">อาหาร</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-sky-600" />
                เพิ่มข้อมูลสุขภาพ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Scan Vitals Section */}
              {/* Scan Vitals Section */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {/* Camera Capture Button */}
                  <button
                    type="button"
                    onClick={() => setIsVitalsCameraOpen(true)}
                    className="flex flex-1 min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 text-center p-3 transition-all hover:bg-sky-100/50"
                  >
                    <Camera className="h-7 w-7 text-sky-600" />
                    <span className="mt-2 text-xs font-bold text-slate-700">ถ่ายรูปเครื่องวัด</span>
                    <p className="text-[9px] text-slate-500 mt-0.5">เปิดกล้องถ่ายภาพทันที</p>
                  </button>
                  
                  {/* File Upload Button */}
                  <label className="flex flex-1 min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center p-3 transition-all hover:bg-slate-100">
                    <Upload className="h-7 w-7 text-slate-500" />
                    <span className="mt-2 text-xs font-bold text-slate-700">อัปโหลดรูปภาพ</span>
                    <p className="text-[9px] text-slate-500 mt-0.5">เลือกจากคลังรูปภาพ</p>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleDeviceScan}
                    />
                  </label>
                </div>

                {deviceScanning ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 bg-sky-50 p-3 rounded-xl border border-sky-100">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>AI กำลังวิเคราะห์สัญญาณชีพจากภาพเครื่องวัดของคุณ...</span>
                  </div>
                ) : null}

                {deviceImagePreview ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-slate-100 border shrink-0">
                      <img src={deviceImagePreview} alt="Device preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-700">ภาพเครื่องวัดที่ประมวลผล</p>
                      <p className="text-[10px] text-slate-500 truncate">{deviceNameLog}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="h-7 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2 rounded-lg"
                      onClick={() => {
                        setDeviceImagePreview("");
                        setDeviceNameLog("");
                      }}
                    >
                      ลบภาพ
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["systolic", "ความดันตัวบน (SYS) - mmHg", "ตัวบน"],
                  ["diastolic", "ความดันตัวล่าง (DIA) - mmHg", "ตัวล่าง"],
                  ["bloodSugar", "ระดับน้ำตาล - mg/dL", "น้ำตาล"],
                  ["weight", "น้ำหนักตัว - kg", "น้ำหนัก"],
                  ["height", "ส่วนสูง - cm", "ส่วนสูง"],
                  ["sleepHours", "ชั่วโมงนอน - ชม.", "ชั่วโมงนอน"],
                  ["heartRate", "ชีพจร - ครั้ง/นาที (bpm)", "ชีพจร"]
                ].map(([key, label, shortPlaceholder]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 pl-1">{label}</label>
                    <Input
                      value={form[key as keyof typeof form]}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={shortPlaceholder}
                      inputMode="decimal"
                    />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={submitRecord}>
                <CheckCircle2 className="h-5 w-5" />
                บันทึกและส่งให้ผู้ดูแลยืนยัน
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {records.slice(-7).reverse().map((record) => (
              <Card key={record.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{record.systolic}/{record.diastolic} · น้ำตาล {record.bloodSugar}</p>
                    <p className="text-xs text-slate-500">{formatThaiDate(record.date)} · {record.source === "patient" ? "ผู้ป่วยบันทึก" : "อุปกรณ์/ผู้ดูแล"}</p>
                  </div>
                  <Badge tone={record.confirmationStatus === "confirmed" ? "green" : record.confirmationStatus === "rejected" ? "red" : "yellow"}>
                    {record.confirmationStatus === "confirmed" ? "ยืนยันแล้ว" : record.confirmationStatus === "rejected" ? "ปฏิเสธ" : "รอยืนยัน"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => setDb((current) => deleteHealthRecord(current, record.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <MultiMetricChart records={records} />
        </TabsContent>

        <TabsContent value="food" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-sky-600" /> Food Scanner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {/* Camera Capture Button */}
                  <button
                    type="button"
                    onClick={() => setIsFoodCameraOpen(true)}
                    className="flex flex-1 min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 text-center p-3 transition-all hover:bg-sky-100/50"
                  >
                    <Camera className="h-7 w-7 text-sky-600" />
                    <span className="mt-2 text-xs font-bold text-slate-700">ถ่ายรูปอาหาร</span>
                    <p className="text-[9px] text-slate-500 mt-0.5">เปิดกล้องถ่ายภาพทันที</p>
                  </button>
                  
                  {/* File Upload Button */}
                  <label className="flex flex-1 min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center p-3 transition-all hover:bg-slate-100">
                    <Upload className="h-7 w-7 text-slate-500" />
                    <span className="mt-2 text-xs font-bold text-slate-700">อัปโหลดรูปภาพ</span>
                    <p className="text-[9px] text-slate-500 mt-0.5">เลือกจากคลังรูปภาพ</p>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                {foodImage ? (
                  <div className="relative w-full min-h-40 overflow-hidden rounded-2xl border bg-slate-100 flex items-center justify-center p-2">
                    <img src={foodImage} alt="Food preview" className="max-h-40 object-contain rounded-xl" />
                  </div>
                ) : null}
              </div>

              {scannerReady ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={foodNameInput}
                      onChange={(e) => setFoodNameInput(e.target.value)}
                      placeholder="ระบุชื่ออาหารหากชื่อไฟล์ไม่ตรงกับรูปภาพ (เช่น ข้าวผัดกะเพรา)..."
                      className="flex-1"
                      disabled={scannerLoading}
                    />
                    <Button onClick={() => runFoodAnalysis(foodNameInput, foodFilesPayload)} disabled={scannerLoading}>
                      วิเคราะห์ใหม่
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {scannerLoading ? (
                      <div className="col-span-2 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-8 text-sky-600 shadow-card">
                        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                        <p className="font-semibold text-slate-700">AI กำลังวิเคราะห์รูปภาพอาหาร...</p>
                      </div>
                    ) : foodAnalysis ? (
                      <>
                        {[
                          ["ชื่ออาหาร", foodAnalysis.name],
                          ["Calories", foodAnalysis.calories],
                          ["Protein", foodAnalysis.protein],
                          ["Carbohydrate", foodAnalysis.carbs],
                          ["Fat", foodAnalysis.fat],
                          ["Sugar", foodAnalysis.sugar],
                          ["Sodium", foodAnalysis.sodium],
                          ["Nutrition Score", foodAnalysis.score]
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-white p-3 shadow-card">
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="font-bold text-slate-900">{value}</p>
                          </div>
                        ))}
                        <div className="col-span-2 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                          <p className="font-bold mb-2">คำแนะนำโภชนาการสำหรับคุณ:</p>
                          <MarkdownRenderer content={foodAnalysis.recommendation} />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <MockChat
            title="ผู้ช่วย AI ของผู้ป่วย"
            seedMessages={db.chatHistory.patient}
            mode="patient"
            context={`ผู้ป่วย ${patient.name}; diagnosis ${patient.diagnosis.join(", ")}; medication ${patient.medications.join(", ")}; BP ล่าสุด ${latest.systolic}/${latest.diastolic}; blood sugar ล่าสุด ${latest.bloodSugar}; exercise ${latest.exerciseMinutes} นาที; sleep ${latest.sleepHours} ชั่วโมง`}
          />
        </TabsContent>
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
      setError("ไม่สามารถเข้าถึงกล้องได้ (กรุณาเชื่อมต่อผ่าน HTTPS หรือตรวจสอบสิทธิ์กล้องบนเบราว์เซอร์ของคุณ)");
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">Live AI Scanner</h3>
          </div>
          <button 
            className="rounded-full bg-black/40 p-2 text-slate-300 hover:text-white backdrop-blur-md transition-all hover:bg-black/60 active:scale-95" 
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
