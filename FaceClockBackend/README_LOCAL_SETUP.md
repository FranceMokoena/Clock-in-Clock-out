# Local Development Setup

## Starting the Backend Server

1. **Install dependencies** (if not already done):
   ```bash
   cd FaceClockBackend
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in `FaceClockBackend/` with:
   ```
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   ```

3. **Start the server**:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Verify it's running**:
   - You should see: `🚀 Server running on port 5000`
   - Test: Open http://localhost:5000/api/health in your browser

## Android Emulator Connection

The Android emulator uses `10.0.2.2` to access `localhost` on your machine.

- Backend URL: `http://10.0.2.2:5000/api`
- This is automatically configured in `FaceClockApp/config/api.js`

## Troubleshooting

**"Network Error" in Android app:**
- Make sure the backend server is running (`npm start` in FaceClockBackend)
- Check that port 5000 is not blocked by firewall
- Verify MongoDB connection is working

**Models not loading:**
- Models should download automatically on `npm install` (postinstall script)
- If not, run: `npm run download-models`
- Check that `FaceClockBackend/models/face-api/` contains the model files

