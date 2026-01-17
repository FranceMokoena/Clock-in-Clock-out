# FaceClock Desktop Application

Desktop application for Admin and Host Company users to manage interns and staff in the FaceClock system.

## Features

- 🔐 Secure login for Admin and Host Company users
- 📊 Dashboard with statistics and overview
- 👥 Staff and Intern management
- 🏢 Host Company management (Admin only)
- 📁 Department management (Admin only)
- 📈 Reports and analytics
- 💻 Cross-platform support (Windows, macOS, Linux)

## Prerequisites

- Node.js 16+ and npm
- Backend server running (FaceClockBackend)

## Installation

1. Navigate to the desktop app directory:
```bash
cd FaceClockDesktop
```

2. Install dependencies:
```bash
npm install
```

## Development

1. Make sure your backend server is running on `http://localhost:5000`

2. Start the development server:
```bash
npm run dev
```

This will:
- Start the React development server on `http://localhost:3000`
- Launch Electron with hot-reload enabled

## Building for Production

### Build for Windows:
```bash
npm run build:win
```

### Build for macOS:
```bash
npm run build:mac
```

### Build for Linux:
```bash
npm run build:linux
```

### Build for all platforms:
```bash
npm run dist
```

Built applications will be in the `dist` folder.

## Configuration

### API URL

Set the backend API URL by creating a `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

For production, update this to your production server URL.

## Usage

1. Launch the application
2. Login with Admin or Host Company credentials
3. Use the sidebar to navigate between different sections
4. Manage staff, interns, companies, and departments

## Project Structure

```
FaceClockDesktop/
├── main.js              # Electron main process
├── preload.js           # Preload script for secure IPC
├── package.json         # Dependencies and scripts
├── public/              # Static files
│   └── index.html       # HTML template
└── src/                 # React application
    ├── App.js           # Main app component
    ├── config/           # Configuration files
    ├── context/          # React contexts (Auth, etc.)
    ├── screens/          # Screen components
    │   ├── Login.js      # Login screen
    │   └── Dashboard.js  # Main dashboard
    └── services/         # API services
```

## Security

- Only Admin and Host Company users can access the desktop app
- All API requests are authenticated
- Secure IPC communication between Electron processes
- Context isolation enabled for security

## Troubleshooting

### Backend Connection Issues

If you can't connect to the backend:
1. Verify the backend server is running
2. Check the API URL in `.env` file
3. Ensure CORS is properly configured on the backend

### Build Issues

If you encounter build errors:
1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear build cache: `npm run build -- --no-cache`
3. Check Node.js version (requires 16+)

## License

ISC

