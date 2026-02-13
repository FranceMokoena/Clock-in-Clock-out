# Hosting Requirements (FaceClock)

## Component list
- Backend API (Node.js + Express) hosted as a long-running service.
- Real-time Socket.IO service hosted on the same process/port as the API.
- Background scheduler jobs (auto reports, system health sampler) run inside the backend process or a dedicated worker.
- MongoDB database (managed or self-hosted).
- ONNX inference runtime and model files (SCRFD + ArcFace) stored on local disk.
- Optional object storage for registration images and supporting documents (S3-compatible).
- Desktop admin portal distribution (Electron builds). Optional: host the React build as a web app.
- Mobile app (Expo) distribution via stores or EAS; no hosting required beyond API endpoints.

## Dependency list + native modules
- Node.js: Desktop tooling requires Node 18 (see `FaceClockDesktop/.nvmrc` and `FaceClockDesktop/package.json`). Backend is compatible with Node 18+; use Node 18 LTS to align all surfaces.
- Native modules (backend): `onnxruntime-node`, `sharp`, `canvas`.
- Native modules (desktop build): `electron` and `electron-builder`.
- OS baseline: Linux x86_64 recommended for cloud deployment.
- Native build prerequisites (when prebuilt binaries are unavailable): build-essential, Python, and system libraries for `canvas` (libcairo, libjpeg, libpng, pango) and `sharp` (libvips).
- Model download: backend `postinstall` triggers `npm run download-models` which downloads ONNX models at install time.
- Scheduler: `autoReports.reportScheduler.start()` and `startSystemHealthSampler()` run continuously with the API.

## Size & build artifacts

**Repository sizes (on disk, includes current `node_modules`)**
- Total repository: 3.22 GiB (3.30 GB)
- `FaceClockBackend/`: 1.18 GiB
- `FaceClockApp/`: 0.29 GiB
- `FaceClockDesktop/`: 1.75 GiB
- Root docs/files: 1.84 MB

**Backend `node_modules` size**
- `FaceClockBackend/node_modules`: 0.68 GiB (695.5 MB)

**ONNX model footprint**
- Total ONNX files in repo: 507.9 MB
- Required runtime models directory (`FaceClockBackend/models/onnx`): 182.45 MB
- Runtime download cache (`FaceClockBackend/temp_models_runtime`): 325.46 MB

**Static assets (images, icons, fonts, PDFs; excluding `node_modules`)**
- Total static assets: 9.34 MB
- `FaceClockApp/assets`: 5.50 MB
- `FaceClockDesktop/assets`: 0.45 MB
- `FaceClockDesktop/build` (icons/resources): 0.69 MB

**Desktop build output**
- No packaged Electron build artifacts found in repo (`dist/`, `out/`, `release/` are absent).
- Current `FaceClockDesktop/build/` is build resources only, not a packaged app.

**Mobile web build output (optional)**
- `FaceClockApp/dist`: 33.74 MB (if used for web hosting)

## Environment variables (names only)

| Scope | Variable | Notes |
| --- | --- | --- |
| Backend | `MONGO_URI` | MongoDB connection string |
| Backend | `MONGODB_URI` | Used by maintenance scripts |
| Backend | `PORT` | API port (default 5000) |
| Backend | `NODE_ENV` | Environment mode |
| Backend | `API_BASE_URL` | API base URL reference |
| Backend | `ENCRYPTION_KEY` | Face embedding encryption key |
| Backend | `ADMIN_USERNAME` | Admin login username |
| Backend | `ADMIN_PASSWORD` | Admin login password |
| Backend | `PORTAL_LOGIN_URL` | Email templates login URL |
| Backend | `APP_LOGIN_URL` | Email templates login URL |
| Backend | `AWS_REGION` | Rekognition + S3 region |
| Backend | `AWS_ACCESS_KEY_ID` | AWS credentials |
| Backend | `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| Backend | `AWS_SESSION_TOKEN` | Optional AWS session token |
| Backend | `AWS_PROFILE` | Optional AWS profile name |
| Backend | `S3_BUCKET` | Optional S3 bucket for image backup |
| Backend | `REKOGNITION_COLLECTION_ID` | Rekognition collection name |
| Backend | `DEVICE_FINGERPRINT_SECRET` | Device fingerprint secret |
| Backend | `AZURE_FACE_ENDPOINT` | Optional Azure Face API |
| Backend | `AZURE_FACE_KEY` | Optional Azure Face API key |
| Backend | `AZURE_FACE_PERSON_GROUP_PREFIX` | Optional Azure Face prefix |
| Backend | `DEFAULT_CLOCK_IN_TIME` | Fallback working hours |
| Backend | `DEFAULT_CLOCK_OUT_TIME` | Fallback working hours |
| Backend | `DEFAULT_BREAK_START_TIME` | Fallback working hours |
| Backend | `DEFAULT_BREAK_END_TIME` | Fallback working hours |
| Backend | `DEFAULT_WORKING_DAYS_PER_WEEK` | Fallback working days |
| Backend | `ROTATION_DUE_SOON_DAYS` | Rotation reminders |
| Backend | `ROTATION_ATTENDANCE_THRESHOLD` | Rotation evaluation |
| Backend | `REPORT_TIMEZONE` | Auto-report timezone |
| Backend | `SMTP_HOST` | Email delivery |
| Backend | `SMTP_PORT` | Email delivery |
| Backend | `SMTP_USER` | Email delivery |
| Backend | `SMTP_PASS` | Email delivery |
| Backend | `SMTP_SECURE` | Email delivery |
| Backend | `SMTP_FROM` | Email sender address |
| Backend | `SMTP_FROM_NAME` | Email sender name |
| Backend | `WHATSAPP_API_URL` | Optional WhatsApp delivery |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | API base URL |
| Mobile (Expo) | `EXPO_PUBLIC_BACKEND_IP` | Local dev IP override |
| Mobile (Expo) | `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` | Optional Vision API key |
| Mobile (Expo) | `GOOGLE_VISION_API_KEY` | Optional Vision API key |
| Mobile (Expo) | `EXPO_PUBLIC_API_ENV` | Optional environment label |
| Mobile (Expo) | `NODE_ENV` | Environment mode |
| Desktop (Electron/React) | `REACT_APP_API_URL` | API base URL |
| Desktop (Electron/React) | `REACT_APP_VERSION` | Version display |
| Desktop (Electron) | `FORCE_DESKTOP_PROD` | Override dev/prod behavior |
| Desktop (Electron) | `NODE_ENV` | Environment mode |

## Ports and networking needs
- API + Socket.IO: `PORT` (default 5000) with WebSocket support enabled.
- CORS: currently configured as `*` (all origins) in `FaceClockBackend/server.js`.
- Outbound network access required for AWS Rekognition/S3, SMTP, and optional Azure Face or Google Vision.
- If horizontally scaling Socket.IO, use sticky sessions or a shared adapter (e.g., Redis) to avoid cross-instance state loss.

## ONNX models table

| Path | Size (MB) | Purpose | Required at runtime |
| --- | --- | --- | --- |
| `FaceClockBackend/models/onnx/scrfd_10g_gnkps_fp32.onnx` | 16.14 | SCRFD face detection | Yes |
| `FaceClockBackend/models/onnx/w600k_r50.onnx` | 166.31 | ArcFace recognition | Yes |
| `FaceClockBackend/temp_models_runtime/det_10g.onnx` | 16.14 | Download cache (SCRFD 10G) | No (cache) |
| `FaceClockBackend/temp_models_runtime/2d106det.onnx` | 4.80 | Download cache (SCRFD 500M fallback) | No (cache) |
| `FaceClockBackend/temp_models_runtime/w600k_r50.onnx` | 166.31 | Download cache (ArcFace) | No (cache) |
| `FaceClockBackend/temp_models_runtime/1k3d68.onnx` | 136.95 | Download cache (landmarks) | No (cache) |
| `FaceClockBackend/temp_models_runtime/genderage.onnx` | 1.26 | Download cache (gender/age) | No (cache) |

## Storage needs summary
- MongoDB (core system of record): Staff, ClockLog, AttendanceCorrection, LeaveApplication, Notification, ReportSettings, etc.
- Clock logs grow continuously; expect sustained write volume from frequent clock-ins and preview validations.
- Face embeddings stored in Staff documents (multiple 512-d vectors per user).
- Profile pictures stored as base64 in MongoDB (256x256 JPEG) and increase document size.
- Registration images can be uploaded to S3 if `S3_BUCKET` is configured (five images per user, optional ID image).
- Supporting documents for corrections/leave are stored as URLs (external file hosting required).
- Auto-report PDFs stored on backend disk at `FaceClockBackend/reports` (0.10 MB currently); implement retention.
- ONNX model files must be stored on disk and accessible at runtime.
- Client-side exports (mobile/desktop PDFs and CSVs) are generated locally and do not require server storage.

## Expected upload size (clock-in)
- Mobile captures a 900px-wide JPEG at ~0.9 compression; typical size is in the ~0.2-1.5 MB range depending on device and lighting.
- Backend upload limit is 10 MB per image; Rekognition hard limit is 15 MB per image.
- Preview validation frames are 200x200 JPEG at low quality and are sent at ~2 FPS during auto-scan.

## Workload estimation (from code behavior)
- Each active user in auto-scan mode sends `/staff/validate-preview` every 500 ms (2 FPS) with low-quality images.
- Each clock-in sends one high-quality image to `/staff/clock`, runs Rekognition search (network-bound) and may run ONNX inference (CPU-bound), then writes to MongoDB and emits Socket.IO notifications.
- Registration sends 5 high-quality images in one request and can optionally upload each to S3.
- CPU-heavy paths: ONNX inference (SCRFD + ArcFace), image resizing (`sharp`), and `canvas` operations.
- Memory-heavy paths: ONNX model loading (182 MB required; ~508 MB total present), plus native ONNX runtime memory allocations.

## Deployment options

### A) Free tier options (realistic and stable)

| Provider | What it can host | Free tier notes | GO / NO-GO |
| --- | --- | --- | --- |
| Oracle Cloud Always Free VM | Full backend (API + Socket.IO + scheduler) | Always Free includes AMD micro instances and Ampere A1 capacity (3,000 OCPU hours + 18,000 GB hours per month, up to 4 OCPU / 24 GB), but capacity can be constrained in some regions. | GO (best free-tier fit) |
| Koyeb Free Web Service | Lightweight API only | Free tier is 512 MB RAM, 0.1 vCPU, 2 GB SSD; too small for ONNX + image processing. | NO-GO for ONNX workloads |
| Google Cloud Run Free Tier | Dev/test API | WebSockets supported but requests time out (up to 60 min). Free tier is limited by vCPU/GiB-seconds and request quotas; cold starts and memory limits make ONNX impractical. | NO-GO for ONNX workloads |
| Fly.io Free Allowances | Not available for new orgs | Free allowances only apply to legacy plans; new orgs are paid. | NO-GO for new accounts |

**Free database options**
- MongoDB Atlas M0 (free): 0.5 GB storage, 500 connections, and 10 GB in/out per 7-day period. Best for dev/demo only.

**Free storage options**
- Cloudflare R2 free tier: 10 GB-month storage, 1M Class A ops, 10M Class B ops, free egress.
- AWS S3 free usage tier (new accounts): 5 GB storage, 20,000 GET, 2,000 PUT, and 100 GB data transfer out per month for 12 months.

### B) Low-cost options ($10-$20/month)

**Best-value single-server architecture**
- 1 VPS (2 vCPU, 4 GB RAM, 40-80 GB SSD) running:
- Node.js API + Socket.IO
- ONNX models on disk
- Scheduler jobs in the same process (or a second Node process)
- PM2 or systemd for process management

**Database and storage**
- MongoDB Atlas M0 can keep costs near $10-$20/month for early-stage usage but has strict limits.
- If you need production capacity, use a paid Atlas tier or self-host MongoDB on the same VPS (at the cost of operational risk).
- Use S3-compatible storage (e.g., Cloudflare R2 or AWS S3) for optional image backups and supporting documents.

**Recommended minimum VPS size (based on model sizes and image processing)**
- Minimum for ONNX: 2 vCPU, 4 GB RAM. 2 GB RAM is risky because ONNX models and image processing can spike native memory.
- Disk: 20 GB minimum for code + models, 40+ GB recommended for reports and growth.

## GO / NO-GO summary (free tier)
- Oracle Cloud Always Free VM: GO (sufficient compute for ONNX if capacity available)
- Koyeb Free: NO-GO (insufficient RAM/CPU for ONNX)
- Google Cloud Run Free: NO-GO (timeouts and resource limits for persistent WebSockets + ONNX)
- Fly.io Free (legacy only): NO-GO for new deployments

## Performance and load facts

### Trace: /staff/validate-preview
- Route: `FaceClockBackend/routes/staff.js` -> `router.post('/validate-preview', upload.single('image'))`
- Calls: `validatePreview(imageBuffer)` in `FaceClockBackend/utils/faceRecognitionONNX.js`
- Call chain and heavy steps:
  - `loadModels()` loads SCRFD detection model and ArcFace recognition model (one-time, memory heavy).
  - `preprocessCanonical(imageBuffer)`:
    - `sharp().metadata()` image decode and metadata.
    - `calculateBrightness()` -> `sharp().greyscale().raw().toBuffer()` + loop over pixels.
    - `detectBlur()` -> `sharp().greyscale().raw().toBuffer()` + Laplacian variance loop.
    - Optional `enhanceImage()` and `correctBrightness()` using `sharp` pipeline.
    - Resize to canonical size and `toBuffer()` using `sharp`.
  - `detectFaces(canonicalBuffer, canonicalWidth, canonicalHeight)`:
    - `preprocessForDetection()` -> `sharp().resize(640x640).raw().toBuffer()` and HWC->CHW tensor reshape loops.
    - `onnxruntime-node` inference (`detectionModel.run`) for SCRFD detection.
    - Uses a global `detectionInferenceQueue` to serialize inference (one at a time).
  - `detectGender(...)` uses landmarks and math only (no ONNX model).
- Not executed in preview:
  - No ArcFace embedding generation (`generateEmbedding` not called).
  - No recognition model inference.
  - No `canvas` usage.
- Per-request cost profile:
  - Image decode + multiple `sharp` passes, Laplacian blur and brightness loops.
  - SCRFD ONNX detection inference (CPU-bound).
  - No embedding inference, no DB writes.

### Request rates / timers
- `FaceClockApp/screens/ClockIn.js` and `FaceClockApp/screens/Shared/ClockIn.js`:
  - `setInterval` at 500ms for preview frames (auto-scan).
  - Calls `/staff/validate-preview`.
  - Hardcoded; not configurable via env.
- `FaceClockApp/screens/RegisterStaff.js`:
  - `setInterval` at 300ms (ID capture step) or 500ms (selfie steps).
  - Calls `/staff/validate-preview`.
  - Hardcoded; not configurable via env.
- `FaceClockApp/context/NotificationContext.js`:
  - Polls every 30s.
  - Calls `/notifications`.
- `FaceClockDesktop/src/components/Notifications/NotificationContext.jsx`:
  - Polls every 30s as fallback.
  - Calls `/api/notifications`.
- Socket.IO is used for real-time notifications (long-lived connection, not polling).

### Capacity estimate
Assumptions from code path:
- Each preview session generates ~2 requests/second to `/staff/validate-preview` (500ms interval).
- Preview path runs SCRFD ONNX detection + `sharp` preprocessing; inference is serialized by `detectionInferenceQueue`.
- Preview timing comment indicates ~200-500ms per request on a warm model.

Estimated safe concurrent preview sessions (steady state, low latency):
- 2 vCPU / 4 GB RAM: 1-2 concurrent preview sessions.
  - Above 2 sessions, the inference queue grows and preview latency increases quickly.
- 4 vCPU / 8 GB RAM: 2-4 concurrent preview sessions.
  - CPU helps preprocessing, but inference remains serialized, so scaling is limited.

First bottleneck:
- CPU (SCRFD inference + image preprocessing) is the first bottleneck due to serialized inference.
- Memory is second (ONNX model footprint and native buffers).
- Network becomes noticeable if many devices upload preview frames simultaneously, but CPU is hit first.

### Storage detail
Local disk writes (server/runtime):
- `FaceClockBackend/modules/autoReports/pdfGenerator.js` writes PDF reports to `FaceClockBackend/reports` via `pdfkit`.
- `FaceClockBackend/utils/faceRecognitionONNX.js` runtime model download writes to:
  - `FaceClockBackend/temp_models_runtime` (download cache)
  - `FaceClockBackend/models/onnx` (required runtime models)
- `FaceClockBackend/download-onnx-models.js` (deploy-time) writes to:
  - `FaceClockBackend/models/onnx`
  - `FaceClockBackend/temp_models` (zip extraction)
- No clock-in or preview images are written to server disk during normal runtime; images are processed in memory.

Base64 images stored in MongoDB:
- `FaceClockBackend/routes/staff.js` `/intern/upload-profile-picture` stores base64 JPEG in `Staff.profilePicture`.
- `FaceClockBackend/models/Staff.js` notes `profilePicture` can be base64 or URL.

Recommendations (storage placement):
- Move `Staff.profilePicture` to object storage (R2/S3) and store URLs in MongoDB.
- Store auto-report PDFs in object storage with lifecycle/retention instead of local disk.
- Use object storage for registration images and supporting documents (already optional with `S3_BUCKET`).
- Keep embeddings, attendance logs, and core metadata in MongoDB.

