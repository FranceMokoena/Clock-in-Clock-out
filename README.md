# Face Clock System ⏰

A professional, tablet-based face recognition system for staff clock-in and clock-out functionality.

![Face Clock System](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue)
![Expo](https://img.shields.io/badge/Expo-54.0.23-black)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## ✨ Features

- **👤 Staff Registration**: Admin can register staff members by capturing their faces
- **📸 Clock In/Out**: Staff can clock in or out using face recognition
- **🔐 Secure**: Face embeddings are encrypted in the database
- **🎨 Modern UI**: Professional, user-friendly interface designed for tablets
- **⚡ Real-time**: Instant face recognition with confidence scores
- **📱 Responsive**: Optimized for tablet devices

## 🏗️ Architecture

### Frontend (React Native / Expo)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation
- **Camera**: Expo Camera
- **HTTP Client**: Axios
- **State Management**: React Hooks

### Backend (Node.js / Express)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Face Recognition**: face-api.js
- **File Upload**: Multer
- **Encryption**: Node.js Crypto

## 📦 Project Structure

```
Clock-in/
├── FaceClockApp/          # React Native Frontend
│   ├── screens/           # App screens
│   ├── config/            # Configuration
│   └── assets/            # Images and resources
├── FaceClockBackend/      # Node.js Backend
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   └── utils/             # Utility functions
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB
- Expo CLI
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd FaceClockBackend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   ENCRYPTION_KEY=your_64_character_hex_key
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd FaceClockApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update API URL in `config/api.js`:
   - Development: `http://localhost:5000/api`
   - Production: Your Render/deployed backend URL

4. Start Expo:
   ```bash
   npm start
   ```

5. Scan QR code with Expo Go app or press `a` for Android emulator

## 🌐 Deployment

### Backend Deployment (Render)

Detailed deployment instructions are in `FaceClockBackend/DEPLOYMENT.md`

Quick steps:
1. Create a Render account
2. Connect your GitHub repository
3. Create a new Web Service
4. Set environment variables in Render dashboard
5. Deploy!

### Environment Variables for Render

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/faceclock
PORT=10000
ENCRYPTION_KEY=your_64_char_hex_key
NODE_ENV=production
```

## 📱 Usage

### Register Staff

1. Open the app and tap **"Register Staff"**
2. Enter the staff member's name
3. Position their face within the frame
4. Tap **"Capture & Register"**
5. Wait for confirmation

### Clock In/Out

1. Open the app and tap **"Clock In / Out"**
2. Position face within the frame
3. Tap **"Clock In"** or **"Clock Out"**
4. Wait for face recognition confirmation

## 🔌 API Endpoints

- `POST /api/staff/register` - Register a new staff member
  - Body: FormData with `name` and `image` file
- `POST /api/staff/clock` - Clock in or out
  - Body: FormData with `type` ('in' or 'out') and `image` file
- `GET /api/staff/list` - Get all registered staff
- `GET /api/staff/logs` - Get clock-in/out logs
- `GET /api/health` - Health check endpoint

## 🔒 Security

- Face embeddings are encrypted before storage
- MongoDB connection is secured
- Environment variables are never committed to git
- CORS is properly configured

## 🛠️ Development

### Running Locally

1. Start MongoDB (if local) or ensure MongoDB Atlas is accessible
2. Start backend: `cd FaceClockBackend && npm start`
3. Start frontend: `cd FaceClockApp && npm start`
4. Scan QR code or press `a` for Android emulator

### Testing

- Backend health check: `http://localhost:5000/api/health`
- Test registration flow
- Test clock-in/out flow
- Verify face recognition accuracy

## 📋 Requirements

### Backend
- Node.js v14+
- MongoDB (Atlas or local)
- face-api.js models (optional but recommended)

### Frontend
- Expo SDK 54
- React Native 0.81.5
- Camera permissions

## 🐛 Troubleshooting

See `FaceClockApp/TROUBLESHOOTING.md` for common issues and solutions.

## 📝 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Note**: Make sure to never commit `.env` files or sensitive credentials to the repository!
