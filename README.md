# FaceClock: Biometric Attendance and Workforce Insights Platform

FaceClock is a full-stack, multi-channel attendance system built for real-world workforce and internship programs. It combines face recognition, geolocation validation, and device trust controls to make clock-ins reliable, auditable, and easy to manage at scale.
This repository contains three production-grade surfaces (mobile, desktop, backend) plus the supporting data models, reporting engine, and operational tooling. It is designed to show end-to-end ownership: from biometric capture on-device, to identity verification in the cloud, to analytics for HR and host companies.

## System at a glance
- Mobile app (React Native + Expo) for staff/intern registration and clock-in/out
- Desktop admin portal (Electron + React) for HR/host company management
- Backend API (Node.js + Express) with MongoDB, real-time events, and reporting
- Face recognition pipeline: AWS Rekognition primary, ONNX (SCRFD + ArcFace) fallback
- Real-time notifications and scheduled report delivery

## Core capabilities
- Face-based clock-in/out with GPS proximity validation
- Multi-role access (Admin, HR, Host Company, Department Manager, Intern/Staff)
- Device fingerprinting and approval workflow to reduce misuse
- Attendance corrections and leave application workflows
- Intern reports, rotation planning, and payroll-ready attendance logs
- Reporting dashboards with export-ready summaries
- Real-time notification delivery via Socket.IO

## Face recognition pipeline (high level)
1) Mobile captures face image + device headers + location
2) Backend validates device trust and location proximity
3) AWS Rekognition searches the collection for a match
4) If Rekognition is unavailable or no match is found, ONNX models run as fallback
5) Clock event is recorded and notifications are emitted

## Architecture overview

[Mobile App] ---> /api/staff/clock (image + gps + device headers) ----> [Backend]
                   |                                                   |
                   |                                                   +--> MongoDB (Staff, ClockLog, Notifications)
                   |                                                   +--> AWS Rekognition (primary match)
                   |                                                   +--> ONNX Runtime (fallback match)
                   |                                                   +--> Report scheduler + delivery
                   |
[Desktop Admin] <--- Socket.IO events + REST APIs ---------------------+

## Tech stack

Backend
- Node.js, Express, Socket.IO
- MongoDB with Mongoose
- AWS SDK (Rekognition, S3)
- ONNX Runtime (SCRFD + ArcFace), Sharp, Canvas
- Luxon, Nodemailer, Multer

Mobile
- React Native + Expo
- Expo Camera, Location, Face Detector, Notifications
- Socket.IO client

Desktop
- Electron + React
- React Router, Socket.IO client
- jsPDF + AutoTable for exports

## Security and privacy highlights
- Passwords hashed with bcryptjs
- Face embeddings stored encrypted at rest (server-side helpers)
- Sensitive embedding fields excluded from most queries
- Device fingerprinting + admin approval controls

## Repository structure
- FaceClockBackend/   Backend API, models, face recognition, reporting
- FaceClockApp/       Mobile app (Expo)
- FaceClockDesktop/   Desktop admin portal (Electron + React)

## Quick start (high level)
1) Backend
   - See `LOCAL_DEVELOPMENT_SETUP.md` and `FaceClockBackend/AWS_REKOGNITION_SETUP.md`
   - Start: `npm run dev` in `FaceClockBackend/`

2) Mobile
   - Start: `npm run start` in `FaceClockApp/`

3) Desktop
   - Start: `npm run dev` in `FaceClockDesktop/`

Additional docs
- `FaceClockDesktop/README.md`
- `FaceClockDesktop/README_SETUP.md`
- `FaceClockDesktop/README-dev.md`
- `BACKEND_STARTUP_GUIDE.md`

## Why this project stands out
- End-to-end ownership of a real operational workflow (biometric capture -> verification -> payroll-ready logs)
- Production-style architecture with multi-tenant roles and real-time notifications
- Practical ML integration with a cloud primary + local fallback strategy
- Extensive reporting and auditing built into the core data model

---
If you are evaluating this repo as a recruiter, start with the architecture and pipeline sections above, then explore the three runtime targets for a complete picture of how the system works in practice.
