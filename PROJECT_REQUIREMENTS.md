You are a Senior Full Stack Engineer, Senior UI/UX Designer, Product Designer and Software Architect.
Your goal is to build a **high-fidelity responsive web prototype** for a healthcare platform. This project is **NOT** intended for production use. It is a prototype for a university competition and should focus on demonstrating the product concept, user experience, workflow, and interaction.
The application should look polished enough that users feel like they are using a real healthcare application.

## General Goal
Build a responsive web application consisting of three systems.
* Patient
* Caregiver
* Doctor
Patient and Caregiver should be designed **mobile-first** because they will eventually become mobile applications.
Doctor should be designed as a **desktop web dashboard** because doctors will use computers in hospitals.
The entire project should feel consistent across all platforms.
---
## Tech Stack
Use:
* Next.js App Router
* TypeScript
* TailwindCSS
* shadcn/ui
* Framer Motion
* Recharts
* Lucide React
* Firebase Authentication
* Firestore
* React Hook Form
* Zod
* Sonner
* Local JSON for mock medical data

Project must have proper folder structure.
Use reusable components.
Use reusable layouts.
Use reusable cards.
Separate environment variables correctly.
```
.env.local
```
Firebase configuration must be loaded from environment variables.
---

## Authentication
Implement real Firebase Authentication.
Create three roles.
Patient
Caregiver
Doctor
Role can temporarily be determined using email domain or predefined email list.
Example
[patient@gmail.com](mailto:patient@gmail.com)
[caregiver@gmail.com](mailto:caregiver@gmail.com)
[doctor@gmail.com](mailto:doctor@gmail.com)
Later this can be replaced with database role checking.
Create
Login
Register
Forgot Password
Logout
Protected Routes
Role Guard
Unauthorized Page
Loading Screen
---

## Language
Entire application must use Thai.
Only keep English for unavoidable medical or technical terms such as
HL7 FHIR
TRUE IDC
API
Dashboard
AI
EMR
HIS
MCSI
Edge AI


# UI Style
Theme
Bright
Blue
White
Soft
Premium
Minimal
Friendly
Healthcare
Do NOT create dark UI.
Design inspiration
Apple Health
Samsung Health
MyChart
Livongo
One Drop
Use
rounded corners
soft shadows
glass effect only slightly
beautiful spacing
large buttons
large touch targets
easy reading
excellent typography
minimal text
icon focused
micro animations
smooth page transitions
skeleton loading

---

# Responsive Rules
Patient
Caregiver
must be designed mobile-first.
Target width
390px
430px

Tablet must adapt naturally.
Desktop should expand gracefully.
Do NOT place the UI inside a fake phone frame.
Doctor dashboard should be optimized for
1280+
1440+
Desktop first.

---

# Navigation
Patient
Bottom Navigation
Home
สุขภาพ
แผนดูแล
แจ้งเตือน
โปรไฟล์
Caregiver
Bottom Navigation
หน้าหลัก
ผู้ป่วย
แจ้งเตือน
ผู้ช่วย AI
โปรไฟล์
Doctor
Left Sidebar
Top Navbar
Dashboard
Patients
Care Plans
Alerts
Reports
Settings

---

# Patient Module
The patient owns all medical data.
Only patient can grant hospital access.
Patient is responsible for personal health records.
Patient features
Home Dashboard
Health Records
Health Graphs
Care Plan
Food Scanner
AI Assistant
Notifications
Consent
Profile

---

## Patient Home
Display
Greeting
Health Score
Latest Blood Pressure
Latest Blood Sugar
Weight
Today's Medication
Today's Tasks
Upcoming Appointment
Current Risk
Recent Notification
Quick Actions

---

## Health Records
Allow recording
Blood Pressure
Blood Sugar
Heart Rate
Weight
Sleep
Exercise
Medication
Food
Water Intake
Notes
Allow editing previous records.
Allow deleting records.
If patient enters health data personally
Status becomes
Pending Caregiver Confirmation
unless caregiver is disabled.

---

## Care Plan
Display AI-generated home care plan approved by doctor.
Include
Medication Schedule
Exercise
Diet
Blood Pressure Measurement
Blood Sugar Measurement
Appointments
Checklist
Patient can mark
Completed
Skipped
Cannot Complete

---

## Health Dashboard
Interactive charts
Blood Pressure
Blood Sugar
Weight
Heart Rate
Medication Adherence
Exercise
Sleep
Food
Show
Daily
Weekly
Monthly
Trend
Use colors
Green
Yellow
Orange
Red

---
## Food Scanner
Upload image.
Later this page will connect to AI API.
Current prototype should simulate AI.
Display
Food Name
Calories
Protein
Carbohydrate
Fat
Sugar
Sodium
Recommendation
Suitable for Diabetes
Suitable for Hypertension
Nutrition Score

---

## Patient AI Assistant
Patient chatbot can reference
Diagnosis
Medication
Care Plan
Recent Blood Pressure
Recent Blood Sugar
Exercise
Diet
Appointments
Chat history should appear realistic.
AI API will be connected later.
Prepare architecture for future API integration.

---

## Consent
Doctor requests access.
Patient receives notification.
Patient may
Approve
Reject
Only patient has this permission.
Caregiver never approves doctor requests because patient is the owner of medical data.

---

## Notifications
Medication Reminder
Appointment Reminder
Doctor Updated Care Plan
Early Warning
Caregiver Reminder
Hospital Request
AI Recommendation

---

## Profile
Personal Information
Hospital Connections
Connected Devices
Notification Settings
Consent History
Logout

## Doctor Module

Doctor interface is desktop-first and optimized for web browsers. The UI should prioritize information density while remaining clean, modern, and easy to scan.

### Doctor Dashboard

Display:

* Total Patients
* High Risk Patients
* Pending Consent Requests
* Today's Appointments
* AI Risk Summary
* Recent Activities
* Early Warning Overview

Include cards, charts, quick statistics and recent notifications.

---

## Patient Search

Doctor can

* Search Patient ID
* Search Citizen ID (Mock)
* Search Name (Mock)

Doctor can request permission to access patient data.

After clicking Request Access:

Patient receives notification.

Doctor sees status:

* Waiting
* Approved
* Rejected

Doctor cannot view medical records until patient approves.

---

## Patient Detail

Display

* Personal Information
* Diagnosis
* Allergy
* Medication
* Laboratory
* Home Monitoring
* Blood Pressure History
* Blood Sugar History
* Weight
* Exercise
* Sleep
* Food
* Timeline
* AI Summary
* Caregiver Confirmation Status

Show graphs and timeline.

Use tabs instead of long pages.

---

## AI Care Plan

When doctor opens patient

AI automatically generates draft care plan.

Include

Medication

Diet

Exercise

Measurement Schedule

Follow-up

Lifestyle Advice

Doctor can

Edit

Delete

Rewrite

Approve

Publish

After Publish

Patient receives notification.

Caregiver also receives notification.

---

## Reports

Generate beautiful dashboard

Include

Health Summary

Trend

Medication Adherence

Exercise

Nutrition

Risk

Recommendation

Timeline

Charts should be interactive.

---

# Caregiver Module

One caregiver cares for exactly one patient.

This is NOT a multi-patient caregiver system.

Caregiver is NOT the owner of medical data.

Patient remains the owner under PDPA.

Caregiver can only access data after patient links caregiver.

---

## Caregiver Home

Display

Today's Tasks

Medication Status

Upcoming Schedule

Recent Alerts

Patient Health Summary

Quick Actions

---

## Patient Monitoring

Display

Blood Pressure

Blood Sugar

Heart Rate

Weight

Medication

Exercise

Sleep

Food

Graphs

Timeline

Care Plan Progress

Checklist

---

## Data Confirmation

If patient records health data

Caregiver must verify before data is considered confirmed for doctor review.

Status

Pending Confirmation

Confirmed

Rejected

If caregiver records data personally

System automatically marks

Confirmed

No extra confirmation required.

Clearly show confirmation badges.

---

## Reminder

Caregiver can send

Medication Reminder

Exercise Reminder

Measurement Reminder

Appointment Reminder

Voice Reminder (Mock)

Push Notification (Mock)

---

## Caregiver AI Assistant

Separate chatbot from patient chatbot.

Caregiver AI references

Patient Diagnosis

Doctor Care Plan

Medication

Recent Measurements

Doctor Notes

Burnout Assessment

Knowledge Base

The chatbot should answer questions related to caregiving and emotional support.

AI API will be connected later.

Prepare architecture only.

---

## Burnout Support

Create dedicated page.

Include

Weekly MCSI Questionnaire

Stress Score

Burnout Level

Daily Motivation

Emotional Support

Task Planning

Positive Feedback

History

Charts

---

# Early Warning

This is one of the core features.

Avoid simple threshold alerts.

Simulate predictive monitoring.

Analyze trends using

Blood Pressure

Blood Sugar

Heart Rate

Weight

Medication Adherence

Exercise

Sleep

Food

Examples

Blood Pressure gradually increases over 3 days.

Weight increases continuously.

Medication skipped multiple times.

Exercise drops significantly.

Sleep duration decreases.

Multiple indicators together should increase risk level.

---

## Risk Levels

Green

Normal

Yellow

Observe

Orange

Moderate Risk

Red

High Risk

Display

Reason

Recommendation

Suggested Action

---

## AI Explanation

Every warning must explain

Why it happened

Which data contributed

Trend visualization

Doctor recommendation

Patient recommendation

---

## Dashboard Visualization

Use charts and cards.

Timeline

Weekly Trend

Monthly Trend

Risk Score

Prediction

Recommendation

History

---

# Hospital Workflow

Simulate hospital workflow.

Patient registers.

Patient logs in.

Patient grants platform consent.

Hospital uploads medical records (Mock).

TRUE IDC stores data (Mock).

Doctor requests patient records.

Patient receives consent request.

Patient approves.

Doctor gains access.

Doctor reviews diagnosis.

Doctor updates medication.

Doctor edits care plan.

Doctor publishes plan.

Patient receives updated care plan.

Patient returns home.

Patient records daily health information.

Caregiver confirms patient-entered data if required.

System analyzes new records.

Dashboard updates.

Early Warning monitors continuously.

Before next appointment

Generate doctor report automatically.

Everything should use mock data while keeping workflow realistic.

---

# TRUE IDC & HL7 FHIR

Do not implement real HL7 FHIR.

Simulate architecture.

Show concepts such as

Hospital

TRUE IDC

FHIR Resource

Patient

Observation

Medication

Condition

Encounter

CarePlan

Consent

Represent them using local JSON.

Structure the project so a real API can replace mock services later.

---

# Firebase

Use Firebase Authentication.

Use Firestore.

Collections

patients

caregivers

doctors

healthRecords

carePlans

notifications

consents

doctorRequests

chatHistory

earlyWarnings

Mock data should be seeded automatically if Firestore is empty.

---

# Mock Data

Generate

20 Patients

1 Caregiver per Patient

5 Doctors

30 Days of Health Records

Blood Pressure

Blood Sugar

Weight

Medication

Exercise

Sleep

Appointments

Notifications

AI Summaries

Care Plans

Alerts

Charts should immediately work using these datasets.

---

# UX Rules

Prioritize user experience over information density.

Avoid long paragraphs.

Use icons.

Large buttons.

Large cards.

Comfortable spacing.

Simple navigation.

Few taps to reach important actions.

Smooth animations.

Skeleton loading.

Toast notifications.

Confirmation dialogs.

Empty states.

Loading states.

Error states.

Success animations.

---

# Coding Rules

Write clean, modular, maintainable code.

Use reusable components.

Avoid duplicated logic.

Separate UI, hooks, services, mock data and utilities.

Prepare API service layer so future AI APIs and hospital APIs can be integrated without major refactoring.

Do not use placeholder pages. Every page should contain meaningful UI and interactive mock functionality.

The final result should look like a polished healthcare platform suitable for demonstrating in a university competition, with realistic workflows, responsive design, smooth interactions, and a strong focus on Patient, Caregiver, Doctor collaboration, AI-assisted home care, and Early Warning monitoring.

