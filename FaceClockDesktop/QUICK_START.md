# Quick Start Guide

## First Time Setup

1. **Install Dependencies**
   ```bash
   cd FaceClockDesktop
   npm install
   ```

2. **Configure API URL**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your backend API URL if different from `http://localhost:5000/api`

3. **Start Backend Server**
   Make sure your FaceClockBackend server is running on port 5000

4. **Start Desktop App**
   ```bash
   npm run dev
   ```

## Login Credentials

- **Admin**: Use your admin username and password
- **Host Company**: Use your host company username and password

## Building Executable

### Windows
```bash
npm run build:win
```
Output: `dist/FaceClock Desktop Setup.exe`

### macOS
```bash
npm run build:mac
```
Output: `dist/FaceClock Desktop.dmg`

### Linux
```bash
npm run build:linux
```
Output: `dist/FaceClock Desktop.AppImage`

## Features Available

✅ Login for Admin and Host Company users  
✅ Dashboard with statistics  
✅ Staff and Intern list view  
✅ Month/Year filtering  
⏳ Full management interfaces (coming soon)

## Next Steps

The basic structure is in place. You can now:
1. Port more features from AdminDashboard.js
2. Add more management screens
3. Enhance the UI/UX
4. Add data export features

