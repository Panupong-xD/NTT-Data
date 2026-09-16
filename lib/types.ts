export type UserRole = "patient" | "caregiver" | "doctor";
export type RiskLevel = "green" | "yellow" | "orange" | "red";
export type ConfirmationStatus = "pending" | "confirmed" | "rejected";
export type CareTaskStatus = "pending" | "completed" | "skipped" | "cannot";
export type ConsentStatus = "waiting" | "approved" | "rejected";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  citizenId: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string[];
  allergies: string[];
  medications: string[];
  doctorId: string;
  caregiverId: string;
  hospital: string;
  healthScore: number;
  email: string;
  dob?: string;
  weight?: number;
  height?: number;
  phone?: string;
  occupation?: string;
  address?: string;
  pin?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  email: string;
}

export interface Caregiver {
  id: string;
  name: string;
  patientId: string;
  relationship: string;
  email: string;
  mcsiScore: number;
}

export interface HealthRecord {
  id: string;
  patientId: string;
  date: string;
  systolic: number;
  diastolic: number;
  bloodSugar: number;
  heartRate: number;
  weight: number;
  height: number;
  sleepHours: number;
  exerciseMinutes: number;
  medicationTaken: boolean;
  foodScore: number;
  waterGlasses: number;
  source: "patient" | "caregiver" | "device";
  confirmationStatus: ConfirmationStatus;
  note?: string;
}

export interface CareTask {
  id: string;
  title: string;
  category: "medication" | "exercise" | "diet" | "measurement" | "appointment";
  time: string;
  detail: string;
  status: CareTaskStatus;
  pendingConfirm?: CareTaskStatus;
}

export interface CarePlan {
  id: string;
  patientId: string;
  doctorId: string;
  status: "draft" | "approved" | "published";
  updatedAt: string;
  summary: string;
  medication: string[];
  diet: string[];
  exercise: string[];
  measurement: string[];
  followUp: string[];
  lifestyle: string[];
  tasks: CareTask[];
}

export interface NotificationItem {
  id: string;
  userRole: UserRole;
  patientId: string;
  title: string;
  message: string;
  type:
    | "medication"
    | "appointment"
    | "care-plan"
    | "warning"
    | "caregiver"
    | "hospital"
    | "ai";
  date: string;
  read: boolean;
}

export interface ConsentRequest {
  id: string;
  patientId: string;
  doctorId: string;
  hospital: string;
  reason: string;
  status: ConsentStatus;
  date: string;
}

export interface EarlyWarning {
  id: string;
  patientId: string;
  level: RiskLevel;
  score: number;
  reason: string;
  contributors: string[];
  doctorRecommendation: string;
  patientRecommendation: string;
  suggestedAction: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

export interface MockDatabase {
  patients: Patient[];
  doctors: Doctor[];
  caregivers: Caregiver[];
  healthRecords: HealthRecord[];
  carePlans: CarePlan[];
  notifications: NotificationItem[];
  consents: ConsentRequest[];
  earlyWarnings: EarlyWarning[];
  chatHistory: Record<string, ChatMessage[]>;
}
