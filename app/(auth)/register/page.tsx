"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  UserPlus, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Activity, 
  Smartphone, 
  IdCard, 
  Briefcase, 
  MapPin, 
  User,
  KeyRound,
  Eye,
  EyeOff,
  X
} from "lucide-react";
import { AuthCard, AuthLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { toast } from "sonner";

interface ProvinceData {
  id: number;
  name_th: string;
  name_en?: string;
}

interface AmphureData {
  id: number;
  province_id: number;
  name_th: string;
}

// Helpers for custom calendar calculation
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Generate patient ID once when page loads
  const [patientId] = useState(() => `HN-${Math.floor(100000 + Math.random() * 900000)}`);

  // Thai Address Database states
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [amphures, setAmphures] = useState<AmphureData[]>([]);

  // Search Combobox refs & states
  const provinceRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);
  const [showProvDropdown, setShowProvDropdown] = useState(false);
  const [showDistDropdown, setShowDistDropdown] = useState(false);
  const [provSearch, setProvSearch] = useState("");
  const [distSearch, setDistSearch] = useState("");

  // Step 1 States (Account & General)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("ชาย");

  // Step 2 States (Physical & Contact)
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [phone, setPhone] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [occupation, setOccupation] = useState("");
  
  // Province / District Names & IDs
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedAmphureId, setSelectedAmphureId] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [addressDetails, setAddressDetails] = useState("");

  // Step 3 States (Security PIN)
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Close dropdowns on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provinceRef.current && !provinceRef.current.contains(event.target as Node)) {
        setShowProvDropdown(false);
      }
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setShowDistDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load all 77 provinces and 928 districts from CDN with local fallback
  useEffect(() => {
    async function loadAddressData() {
      try {
        const cachedProvinces = localStorage.getItem("thai-provinces-list");
        const cachedAmphures = localStorage.getItem("thai-amphures-list");

        if (cachedProvinces && cachedAmphures) {
          try {
            const parsedProv = JSON.parse(cachedProvinces);
            const parsedAmp = JSON.parse(cachedAmphures);
            if (Array.isArray(parsedProv) && Array.isArray(parsedAmp) && parsedProv.length > 0) {
              setProvinces(parsedProv);
              setAmphures(parsedAmp);
              return;
            }
          } catch (e) {
            localStorage.removeItem("thai-provinces-list");
            localStorage.removeItem("thai-amphures-list");
          }
        }

        const [provRes, ampRes] = await Promise.all([
          fetch("https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json"),
          fetch("https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json")
        ]);

        if (!provRes.ok || !ampRes.ok) {
          throw new Error("Address database CDN returned non-OK status");
        }

        const provData = (await provRes.json()) as ProvinceData[];
        const ampData = (await ampRes.json()) as AmphureData[];

        // Sort provinces by name (Thai collation)
        provData.sort((a, b) => a.name_th.localeCompare(b.name_th, "th"));

        setProvinces(provData);
        setAmphures(ampData);

        localStorage.setItem("thai-provinces-list", JSON.stringify(provData));
        localStorage.setItem("thai-amphures-list", JSON.stringify(ampData));
      } catch (err) {
        console.error("Failed loading Thailand address DB, using Loei/Bangkok fallbacks:", err);
        // Fallback for core test demo
        setProvinces([
          { id: 1, name_th: "เลย" },
          { id: 2, name_th: "กรุงเทพมหานคร" },
          { id: 3, name_th: "นนทบุรี" },
          { id: 4, name_th: "สมุทรปราการ" },
          { id: 5, name_th: "ชลบุรี" },
          { id: 6, name_th: "เชียงใหม่" },
          { id: 7, name_th: "ขอนแก่น" }
        ]);
        setAmphures([
          { id: 101, province_id: 1, name_th: "เมืองเลย" },
          { id: 102, province_id: 1, name_th: "วังสะพุง" },
          { id: 103, province_id: 1, name_th: "เชียงคาน" },
          { id: 104, province_id: 1, name_th: "ภูเรือ" },
          { id: 105, province_id: 1, name_th: "ภูกระดึง" },
          { id: 201, province_id: 2, name_th: "ปทุมวัน" },
          { id: 202, province_id: 2, name_th: "วัฒนา" }
        ]);
      }
    }
    loadAddressData();
  }, []);

  // Age auto-calculator from birthdate
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge >= 0 ? String(calculatedAge) : "0");
    }
  }, [dob]);

  // Province search filtering
  const filteredProvinces = useMemo(() => {
    const search = provSearch.trim().toLowerCase();
    if (!search || search === province.toLowerCase()) return provinces;
    return provinces.filter(p => 
      p.name_th.includes(search) || 
      (p.name_en && p.name_en.toLowerCase().includes(search))
    );
  }, [provSearch, provinces, province]);

  // Filter amphures based on selected province & search text
  const filteredAmphures = useMemo(() => {
    if (!selectedProvinceId) return [];
    const search = distSearch.trim().toLowerCase();
    const matchesProvinceAmphures = amphures.filter(a => String(a.province_id) === selectedProvinceId);
    
    if (!search || search === district.toLowerCase()) {
      return matchesProvinceAmphures.sort((a, b) => a.name_th.localeCompare(b.name_th, "th"));
    }
    
    return matchesProvinceAmphures
      .filter(a => a.name_th.includes(search))
      .sort((a, b) => a.name_th.localeCompare(b.name_th, "th"));
  }, [selectedProvinceId, distSearch, amphures, district]);

  const validateStep1 = () => {
    if (!email.includes("@")) {
      toast.error("กรุณากรอกอีเมลให้ถูกต้อง");
      return false;
    }
    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("ยืนยันรหัสผ่านไม่ตรงกัน");
      return false;
    }
    if (!fullName.trim()) {
      toast.error("กรุณากรอก ชื่อ - นามสกุล");
      return false;
    }
    if (!dob) {
      toast.error("กรุณาเลือก วัน/เดือน/ปีเกิด");
      return false;
    }
    if (!age || Number(age) <= 0) {
      toast.error("อายุไม่ถูกต้อง");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!weight || Number(weight) <= 0) {
      toast.error("กรุณากรอกน้ำหนักตัวให้ถูกต้อง");
      return false;
    }
    if (!height || Number(height) <= 0) {
      toast.error("กรุณากรอกส่วนสูงให้ถูกต้อง");
      return false;
    }
    if (!phone || phone.length < 9 || phone.length > 10) {
      toast.error("กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก");
      return false;
    }
    if (!citizenId || citizenId.length !== 13 || isNaN(Number(citizenId))) {
      toast.error("กรุณากรอกเลขบัตรประชาชน 13 หลัก");
      return false;
    }
    if (!occupation.trim()) {
      toast.error("กรุณากรอกอาชีพ");
      return false;
    }
    if (!province) {
      toast.error("กรุณาเลือกจังหวัด");
      return false;
    }
    if (!district) {
      toast.error("กรุณาเลือกอำเภอ / เขต");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (pin.length !== 6 || isNaN(Number(pin))) {
      toast.error("รหัส PIN ต้องเป็นตัวเลข 6 หลัก");
      return false;
    }
    if (pin !== confirmPin) {
      toast.error("ยืนยันรหัส PIN ไม่ตรงกัน");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3 || !validateStep3()) return;

    setLoading(true);
    try {
      const fullAddress = province && district 
        ? `${addressDetails ? addressDetails + " " : ""}อำเภอ${district} จังหวัด${province}`
        : addressDetails;

      await registerUser(email, password, fullName, {
        role: "patient",
        citizenId,
        age: Number(age),
        gender,
        dob,
        weight: Number(weight),
        height: Number(height),
        phone,
        occupation,
        address: fullAddress,
        pin
      });
    } catch (err) {
      console.error("Sign up failed:", err);
      toast.error("ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="สมัครสมาชิกผู้ป่วย"
      subtitle={
        step === 1 
          ? "ขั้นตอนที่ 1/3: บัญชีผู้ใช้งาน & ข้อมูลส่วนตัว" 
          : step === 2 
          ? "ขั้นตอนที่ 2/3: สุขภาพกาย & ข้อมูลติดต่อ" 
          : "ขั้นตอนที่ 3/3: ตั้งรหัสความปลอดภัย PIN"
      }
      footer={
        <>
          มีบัญชีอยู่แล้ว? <AuthLink href="/login">เข้าสู่ระบบ</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* STEP 1: Account details & basic info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">อีเมล *</label>
              <Input 
                type="email" 
                placeholder="example@gmail.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">รหัสผ่าน *</label>
                <Input 
                  type="password" 
                  placeholder="อย่างน้อย 6 หลัก" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500" 
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">ยืนยันรหัสผ่าน *</label>
                <Input 
                  type="password" 
                  placeholder="ยืนยันรหัสผ่าน" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500" 
                />
              </div>
            </div>

            <div className="border-t border-slate-100 my-2 pt-2" />

            <div>
              <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">ชื่อ - นามสกุล *</label>
              <Input 
                type="text" 
                placeholder="นายสมชาย สุขใจ" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
              />
            </div>

            {/* Separated to single full-width rows for beautiful layout padding and zero horizontal overlaps */}
            <div className="space-y-4">
              <CustomDatePicker
                value={dob}
                onChange={setDob}
                label="วัน/เดือน/ปีเกิด *"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">เพศ</label>
              <div className="grid grid-cols-3 gap-2">
                {["ชาย", "หญิง", "อื่นๆ"].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      gender === g 
                        ? "bg-sky-50 border-sky-600 text-sky-700 shadow-sm" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Physical Metrics & Contact Info */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">น้ำหนัก (กิโลกรัม) *</label>
                <Input 
                  type="number" 
                  placeholder="70" 
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">ส่วนสูง (เซนติเมตร) *</label>
                <Input 
                  type="number" 
                  placeholder="170" 
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">เบอร์โทร *</label>
                <Input 
                  type="tel" 
                  placeholder="080xxxxxxx" 
                  value={phone}
                  maxLength={10}
                  onChange={e => setPhone(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">เลขบัตรประชาชน *</label>
                <Input 
                  type="text" 
                  placeholder="13 หลัก" 
                  value={citizenId}
                  maxLength={13}
                  onChange={e => setCitizenId(e.target.value)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">อาชีพ *</label>
              <Input 
                type="text" 
                placeholder="ข้าราชการ / พนักงานบริษัท / รับจ้าง" 
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
              />
            </div>

            <div className="border-t border-slate-100 my-2 pt-1" />
            
            {/* Searchable Comboboxes (Search Bar styling) */}
            <div className="space-y-4">
              
              {/* Province Searchable Combobox */}
              <div className="relative" ref={provinceRef}>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">จังหวัด *</label>
                <Input
                  type="text"
                  placeholder="พิมพ์ค้นหาจังหวัด... (เช่น เลย, กรุงเทพฯ, เชียงใหม่)"
                  value={provSearch}
                  onChange={e => {
                    setProvSearch(e.target.value);
                    setShowProvDropdown(true);
                    if (!e.target.value) {
                      setProvince("");
                      setSelectedProvinceId("");
                      setDistrict("");
                      setSelectedAmphureId("");
                      setDistSearch("");
                    }
                  }}
                  onFocus={() => setShowProvDropdown(true)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full"
                />
                
                {/* Floating Province Dropdown List */}
                {showProvDropdown && filteredProvinces.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-2xl border border-slate-150 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                    {filteredProvinces.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProvinceId(String(p.id));
                          setProvince(p.name_th);
                          setProvSearch(p.name_th);
                          setShowProvDropdown(false);
                          // Reset district selection
                          setSelectedAmphureId("");
                          setDistrict("");
                          setDistSearch("");
                        }}
                        className={`w-full text-left rounded-xl px-4 py-2 text-xs font-semibold hover:bg-sky-50 hover:text-sky-700 transition-all ${
                          String(p.id) === selectedProvinceId ? "bg-sky-50 text-sky-700 font-bold" : "text-slate-700"
                        }`}
                      >
                        {p.name_th}
                      </button>
                    ))}
                  </div>
                )}
                {showProvDropdown && filteredProvinces.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-150 bg-white p-3 shadow-xl text-center text-xs text-slate-400">
                    ไม่พบข้อมูลจังหวัด
                  </div>
                )}
              </div>

              {/* District Searchable Combobox */}
              <div className="relative" ref={districtRef}>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">อำเภอ / เขต *</label>
                <Input
                  type="text"
                  placeholder={province ? "พิมพ์ค้นหาอำเภอ / เขต..." : "กรุณาเลือกจังหวัดก่อน"}
                  value={distSearch}
                  disabled={!province}
                  onChange={e => {
                    setDistSearch(e.target.value);
                    setShowDistDropdown(true);
                    if (!e.target.value) {
                      setDistrict("");
                      setSelectedAmphureId("");
                    }
                  }}
                  onFocus={() => setShowDistDropdown(true)}
                  className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full disabled:opacity-50"
                />
                
                {/* Floating District Dropdown List */}
                {showDistDropdown && filteredAmphures.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-2xl border border-slate-150 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                    {filteredAmphures.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAmphureId(String(a.id));
                          setDistrict(a.name_th);
                          setDistSearch(a.name_th);
                          setShowDistDropdown(false);
                        }}
                        className={`w-full text-left rounded-xl px-4 py-2 text-xs font-semibold hover:bg-sky-50 hover:text-sky-700 transition-all ${
                          String(a.id) === selectedAmphureId ? "bg-sky-50 text-sky-700 font-bold" : "text-slate-700"
                        }`}
                      >
                        {a.name_th}
                      </button>
                    ))}
                  </div>
                )}
                {showDistDropdown && filteredAmphures.length === 0 && province && (
                  <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-150 bg-white p-3 shadow-xl text-center text-xs text-slate-400">
                    ไม่พบข้อมูลอำเภอ
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">รายละเอียดที่อยู่เพิ่มเติม (บ้านเลขที่, หมู่, ถนน)</label>
              <Input 
                type="text" 
                placeholder="123/4 หมู่ 5 ถนนหลัก..." 
                value={addressDetails}
                onChange={e => setAddressDetails(e.target.value)}
                className="rounded-2xl border-sky-100/70 h-12 px-4 text-sm font-semibold focus:ring-1 focus:ring-sky-500 w-full" 
              />
            </div>
          </div>
        )}

        {/* STEP 3: Patient ID Display & Security PIN Setup */}
        {step === 3 && (
          <div className="space-y-4.5 animate-in fade-in-50 duration-200">
            
            {/* Generated Patient ID Badge */}
            <div className="rounded-2xl bg-sky-50/50 border border-sky-100/60 p-4.5 text-center">
              <p className="text-[10px] font-bold text-sky-800 tracking-wide uppercase mb-1">เลขประจำตัวผู้ป่วยที่ระบบจัดสรร (Patient ID)</p>
              <p className="text-2xl font-black text-sky-950 tracking-wider font-mono">{patientId}</p>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                ใช้สำหรับแบ่งปันตารางสุขภาพกับผู้ดูแล และแลกเปลี่ยนข้อมูลเวชระเบียนโรงพยาบาล มศว
              </p>
            </div>

            <div className="border-t border-slate-100 my-2 pt-1" />

            {/* Redesigned Sleek Single PIN Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">ตั้งรหัสความปลอดภัย PIN (ตัวเลข 6 หลัก) *</label>
                <div className="relative">
                  <Input 
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••••" 
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                    className="rounded-2xl border-sky-100/70 h-12 text-center tracking-[0.6em] text-lg font-black text-slate-800 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 pr-10 pl-4" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">ยืนยันรหัส PIN 6 หลัก *</label>
                <div className="relative">
                  <Input 
                    type={showConfirmPin ? "text" : "password"}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••••" 
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    className="rounded-2xl border-sky-100/70 h-12 text-center tracking-[0.6em] text-lg font-black text-slate-800 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 pr-10 pl-4" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 pl-1 leading-relaxed">
                  * รหัส PIN นี้จะทำหน้าที่ปกป้องบัญชีและอำนวยความสะดวกในการเข้าบันทึกตารางสุขภาพด่วนในแอปพลิเคชัน
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Wizard Navigation */}
        <div className="flex gap-3 pt-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 rounded-2xl border-slate-200 py-3 h-12 flex items-center justify-center gap-1.5 font-bold text-slate-700 active:scale-95 transition-all animate-in fade-in duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
              ย้อนกลับ
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold py-3 h-12 flex items-center justify-center gap-1.5 active:scale-95 transition-all animate-in fade-in duration-150"
            >
              ถัดไป
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold py-3 h-12 flex items-center justify-center gap-1.5 active:scale-95 transition-all animate-in fade-in duration-150"
            >
              {loading ? "กำลังลงทะเบียน..." : "เสร็จสิ้น & เริ่มใช้งาน"}
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </AuthCard>
  );
}

// Custom Premium Thai Calendar DatePicker Component for Birthdays (Modal Layout)
interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
}

function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"year" | "month" | "day">("year");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to today
  const initialDate = useMemo(() => {
    if (value) {
      const parts = value.split("-");
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(value ? initialDate.getDate() : null);

  // Sync state if value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      setCurrentYear(Number(parts[0]));
      setCurrentMonth(Number(parts[1]) - 1);
      setSelectedDay(Number(parts[2]));
    }
  }, [value]);

  // Click outside to close (only applies to container, but modal uses full-screen dim click)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Leave modal close to explicit backdrop/close buttons to prevent accidental dismissals
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current; y >= current - 100; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const monthsTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    onChange(`${currentYear}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const formattedDisplayDate = useMemo(() => {
    if (!value) return "";
    const parts = value.split("-");
    const y = Number(parts[0]) + 543; // Thai Buddhist Era (พ.ศ.)
    const m = monthsTH[Number(parts[1]) - 1];
    const d = Number(parts[2]);
    return `${d} ${m} ${y}`;
  }, [value]);

  const handleOpen = () => {
    setView("year");
    setIsOpen(true);
  };

  return (
    <div className="w-full" ref={containerRef}>
      <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">{label}</label>
      <input
        type="text"
        readOnly
        placeholder="เลือกวันเกิด..."
        value={formattedDisplayDate}
        onClick={handleOpen}
        className="w-full h-12 rounded-2xl border border-sky-100/70 bg-white px-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all cursor-pointer select-none"
      />

      {isOpen && (
        /* Transparent backdrop container to center popup and allow closing on clicking outside */
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent p-5 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Calendar Picker Modal Card */}
          <div 
            className="relative w-full max-w-[340px] rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation() /* Prevent closing when clicking card body */}
          >
            
            {/* Header Panel with Back Button & Close Cross */}
            <div className="flex items-center justify-between mb-4.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {view !== "year" && (
                  <button
                    type="button"
                    onClick={() => setView(view === "day" ? "month" : "year")}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
                    title="ย้อนกลับ"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                )}
                <h4 className="text-xs font-black text-slate-800">
                  {view === "year" 
                    ? "เลือกปี พ.ศ. เกิด" 
                    : view === "month" 
                    ? `เลือกเดือน (พ.ศ. ${currentYear + 543})` 
                    : `เลือกวัน (${monthsTH[currentMonth]} ${currentYear + 543})`}
                </h4>
              </div>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* VIEW 1: Year Selector Grid (4 columns) */}
            {view === "year" && (
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentYear(y);
                      setView("month");
                    }}
                    className={`py-2 text-[11px] font-black rounded-xl transition-all ${
                      y === currentYear 
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-105" 
                        : "border border-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {y + 543}
                  </button>
                ))}
              </div>
            )}

            {/* VIEW 2: Month Selector Grid (3 columns) */}
            {view === "month" && (
              <div className="grid grid-cols-3 gap-2.5">
                {monthsTH.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setView("day");
                    }}
                    className={`py-3 text-[11px] font-black rounded-xl transition-all ${
                      idx === currentMonth 
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-105" 
                        : "border border-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {m.replace("มกราคม", "ม.ค.")
                      .replace("กุมภาพันธ์", "ก.พ.")
                      .replace("มีนาคม", "มี.ค.")
                      .replace("เมษายน", "เม.ย.")
                      .replace("พฤษภาคม", "พ.ค.")
                      .replace("มิถุนายน", "มิ.ย.")
                      .replace("กรกฎาคม", "ก.ค.")
                      .replace("สิงหาคม", "ส.ค.")
                      .replace("กันยายน", "ก.ย.")
                      .replace("ตุลาคม", "ต.ค.")
                      .replace("พฤศจิกายน", "พ.ย.")
                      .replace("ธันวาคม", "ธ.ค.")
                    }
                  </button>
                ))}
              </div>
            )}

            {/* VIEW 3: Day Selector Calendar Grid */}
            {view === "day" && (
              <div>
                {/* Days of Week Row Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d, i) => (
                    <span 
                      key={d} 
                      className={`text-[10px] font-black py-1 ${
                        i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-400"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Grid of Days */}
                <div className="grid grid-cols-7 gap-1 text-center animate-in fade-in zoom-in-95 duration-150">
                  {/* Pad offset days of previous month */}
                  {Array(firstDay).fill(0).map((_, i) => (
                    <span key={`empty-${i}`} className="h-8 w-8 inline-block" />
                  ))}

                  {/* Render current month days */}
                  {Array(daysInMonth).fill(0).map((_, idx) => {
                    const day = idx + 1;
                    const isSelected = selectedDay === day;
                    const isToday = 
                      new Date().getDate() === day && 
                      new Date().getMonth() === currentMonth && 
                      new Date().getFullYear() === currentYear;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`h-8 w-8 text-xs font-bold rounded-full flex items-center justify-center transition-all ${
                          isSelected 
                            ? "bg-sky-600 text-white shadow-md shadow-sky-500/25 scale-105" 
                            : isToday
                            ? "border border-sky-500 text-sky-600 hover:bg-sky-50"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
