# WELLYNC - Collaborative Healthcare Prototype

A high-fidelity responsive web prototype designed for collaborative chronic disease management and proactive health monitoring across Patients, Caregivers, and Doctors.

---

## Table of Contents

- Overview
- Target Roles and Workflows
  - 1. Patient Portal (Mobile-First)
  - 2. Caregiver Portal (Mobile-First)
  - 3. Doctor Dashboard (Desktop-First)
- Core Features and Architecture
  - Multi-Factor Early Warning System
  - Data Ownership and Consent Flow (PDPA Aligned)
  - AI-Powered Health Tools
  - Caregiver Strain Monitoring (MCSI)
  - HL7 FHIR and True IDC Architecture Simulation
- Tech Stack
- Project Directory Structure
- Getting Started
  - Prerequisites
  - Installation
  - Environment Variables
  - Development Server
  - Building for Production
- SWU AI Gateway Configuration
- Demo Accounts and Quick Access
- License and Disclaimer

---

## Overview

WELLYNC is a high-fidelity prototype developed for university healthcare innovation competitions. The platform bridges the gap between home-based patient monitoring and clinical decision-making by uniting three essential stakeholders in chronic disease care:

- Patients managing conditions such as Type 2 Diabetes and Hypertension at home.
- Caregivers verifying daily vital measurements, assisting with treatment compliance, and preventing caregiver burnout.
- Doctors reviewing aggregated patient records, monitoring automated risk warnings, and publishing AI-assisted personalized care plans.

The system is designed with a mobile-first interface for Patients and Caregivers, reflecting future native mobile applications, and a high-density desktop dashboard for Doctors working in hospital workstations.

---

## Target Roles and Workflows

### 1. Patient Portal (Mobile-First)

The patient is the primary owner of their personal health data. Features include:

- Daily Health Dashboard: View real-time Health Score (0-100), latest vital signs (Blood Pressure, Blood Glucose, BMI, Resting Heart Rate), treatment targets, daily care tasks, and upcoming hospital appointments.
- Vitals and Log Management: Record daily blood pressure, blood glucose, weight, sleep duration, and heart rate. Includes a camera and file scanner that uses AI vision to extract readings directly from digital medical devices (blood pressure monitors, glucometers, digital scales).
- Food Scanner: AI-assisted nutritional breakdown that accepts uploaded food images or menu names to estimate calories, macronutrients (protein, carbs, fat), sugar, and sodium, paired with disease-specific dietary advice.
- AI Health Assistant: Interactive health companion with chat history, contextualized to the patient's specific diagnoses, prescribed medications, recent vitals, and physician-approved care plan.
- Consent Authorization: Receive, review, and approve or reject hospital and physician requests for medical record access.

### 2. Caregiver Portal (Mobile-First)

Designed for a one-to-one caregiving model where a family member or assigned caregiver supports a single patient:

- Care Task Checklist: Track and confirm daily tasks such as morning medications, scheduled blood pressure checks, and evening physical activities.
- Data Confirmation Workflow: When a patient logs health data manually, it enters a "Pending Confirmation" status. The caregiver verifies the measurements before they are marked as confirmed for doctor review.
- Reminder Dispatcher: Send medication, exercise, measurement, and clinic visit reminders to the patient.
- Caregiver AI Assistant: Specialized AI assistant offering guidance on elderly care, daily routine scheduling, and medication management.
- Caregiver Burnout Support: Weekly Modified Caregiver Strain Index (MCSI) questionnaire with real-time scoring, stress level grading (Low, Moderate, High), emotional support cards, and sleep trend analysis to prevent caregiver fatigue.

### 3. Doctor Dashboard (Desktop-First)

Optimized for 1280px+ desktop displays with high information density, rapid scanning, and clinical workflow tools:

- Clinical Dashboard: High-level overview displaying total patients under care, high-risk patient count, pending consent requests, and today's appointment schedule.
- Patient Directory & Access Management: Search patients by Name, Citizen ID, or Patient ID (HN). Request access to patient records with real-time consent status badges (Waiting, Approved, Rejected).
- Comprehensive Clinical Record: Multi-tab view including Patient Summary (Diagnoses, Allergies, Medications, Lab Results), Home Monitoring Graphs, Confirmation Timelines, and Care Plans.
- AI-Assisted Care Plan Generator: Automatically creates structured care plan drafts (Medication, Diet, Exercise, Measurement Schedule, Follow-up, Lifestyle Advice) tailored to recent vitals and lab results. Doctors can edit, refine with AI, and publish the plan directly to the patient and caregiver.
- Clinical Reports and Analytics: Interactive multi-metric charts (Blood Pressure, Blood Sugar, Heart Rate, Weight, Sleep, Exercise) and compliance tracking for medication adherence and daily monitoring.

---

## Core Features and Architecture

### Multi-Factor Early Warning System

Unlike simplistic threshold-based alerts, the Early Warning engine analyzes multi-day trends across multiple physiological and behavioral data streams:

- Trend Indicators: 3-day continuous blood pressure increases, 7-day steady weight gain, recurring skipped medications, significant drops in sleep duration, and reduced physical activity.
- Risk Tones: Green (Normal), Yellow (Observation), Orange (Moderate Risk), and Red (High Risk).
- Explainable AI: Every warning provides an actionable breakdown of contributing factors, physician recommendations, and patient self-care instructions.

### Data Ownership and Consent Flow (PDPA Aligned)

In strict compliance with Personal Data Protection principles:

- The patient retains absolute ownership of all health records.
- Physicians cannot inspect full clinical histories until explicit patient consent is granted.
- Caregivers cannot authorize physician access requests on behalf of the patient.

### AI-Powered Health Tools

The platform integrates with large language models through the SWU AI Gateway (supporting Google Gemini 2.5 Flash and related models), with a built-in fallback simulation layer:

- Vision OCR for medical device screens.
- Food nutrient and suitability analysis.
- Real-time patient and caregiver conversational agents.
- Automated clinical care plan drafting for physicians.

### Caregiver Strain Monitoring (MCSI)

Implements the Modified Caregiver Strain Index (MCSI) to evaluate physical, psychological, and social burdens experienced by caregivers, providing targeted emotional and operational support.

### HL7 FHIR and True IDC Architecture Simulation

Simulates an enterprise healthcare cloud architecture:

- Cloud Storage: Structured mock database representing centralized True IDC secure cloud storage.
- Standard Data Structures: Data schemas model FHIR resources including Patient, Observation, Condition, MedicationStatement, CarePlan, and Consent.

---

## Tech Stack

- Framework: Next.js 15 (App Router)
- Runtime / UI Library: React 19, TypeScript
- Styling: Tailwind CSS, PostCSS, Radix UI Primitives
- Icons & Animation: Lucide React, Framer Motion
- Data Visualization: Recharts
- Form Management & Validation: React Hook Form, Zod
- UI Components: shadcn/ui design patterns, Sonner (Toast notifications)
- HTTP & Network: got-scraping (for server-side SWU AI gateway routing)
- State & Mock Database: Reactive local storage store with automatic seeding and multi-role synchronization

---

## Project Directory Structure

```text
├── app/
│   ├── (auth)/                # Authentication routes (login, register, forgot-password)
│   ├── api/                   # Server API route handlers (SWU AI chat and model list)
│   ├── caregiver/             # Caregiver portal pages (home, care-plan, burnout, AI, profile)
│   ├── doctor/                # Doctor dashboard pages (dashboard, patients, reports, care-plans, settings)
│   ├── patient/               # Patient portal pages (home, health, care-plan, notifications, profile)
│   ├── layout.tsx             # Root application layout
│   └── page.tsx               # Entry point redirecting to /login
├── components/
│   ├── auth/                  # Authentication cards and role switchers
│   ├── chat/                  # Interactive AI chat interface component
│   ├── health/                # Metric cards, early warning banners, hospital carousels, charts
│   ├── layouts/               # Responsive shells (MobileShell for mobile, DoctorShell for desktop)
│   └── ui/                    # Reusable UI primitives (buttons, dialogs, tabs, badges, markdown renderer)
├── lib/
│   ├── data/                  # Medical seed data and mock database initialization
│   ├── hooks/                 # React custom hooks (useAuth, useMockStore)
│   ├── services/              # Client services, AI gateway client, mock store state managers
│   ├── types.ts               # TypeScript data models and interfaces
│   └── utils.ts               # Shared utility functions and formatting helpers
├── public/                    # Static assets and campaign banners
├── PROJECT_REQUIREMENTS.md    # Original project specification document
├── package.json               # Dependencies and npm scripts
├── tailwind.config.ts         # Tailwind styling configuration
└── tsconfig.json              # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd true-innovation-mock
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Copy the example environment configuration file:

```bash
cp .env.example .env.local
```

Configure `.env.local` with your SWU AI credentials (optional for local mock mode, required for live AI responses):

```env
NEXT_PUBLIC_SWU_API_KEY=your_swu_api_key_here
NEXT_PUBLIC_SWU_USER_ID=your_swu_user_id_here
NEXT_PUBLIC_SWU_MODEL=google/gemini-2.5-flash
```

Note: SWU AI credentials can also be configured directly in the application UI under the Profile or Doctor Settings pages without editing the `.env.local` file.

### Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```

---

## SWU AI Gateway Configuration

When connecting to the SWU AI Gateway from outside the university intranet:

1. Ensure you are connected to the campus VPN or university network.
2. If encountering Cloudflare CORS verification on local browsers, you can use the included helper script to launch an isolated Chrome instance:

```bash
chmod +x run-chrome-no-cors.sh
./run-chrome-no-cors.sh
```

---

## Demo Accounts and Quick Access

The login screen provides one-click role buttons to switch between workflows:

| Role | Email | Password | Default Interface |
| :--- | :--- | :--- | :--- |
| Patient | patient@gmail.com | demo1234 | Mobile-first (/patient) |
| Caregiver | caregiver@gmail.com | demo1234 | Mobile-first (/caregiver) |
| Doctor | doctor@gmail.com | demo1234 | Desktop dashboard (/doctor) |

The mock database is pre-seeded with 20 patients, 20 caregivers, 5 doctors, and 30 days of longitudinal vital signs and compliance logs. All data updates made during a session persist in your browser LocalStorage and immediately update charts, risk evaluations, and task statuses across all views.

---

## License and Disclaimer

This project is a competition prototype developed for educational and demonstration purposes. It is not intended for direct clinical diagnosis or production medical use.
