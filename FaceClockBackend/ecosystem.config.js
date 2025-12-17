require('dotenv').config();
const path = require('path');

// Determine working directory - use absolute path for EC2, relative for local
const isProduction = process.env.NODE_ENV === 'production';
const workingDir = isProduction 
  ? '/home/ubuntu/FaceClockBackend' 
  : path.join(__dirname);

// Use absolute path for script to ensure it's found
const scriptPath = path.join(workingDir, 'server.js');

module.exports = {
  apps: [
    {
      name: "faceclock",
      script: scriptPath,
      cwd: workingDir,
      interpreter: "node",
      interpreter_args: "--max-old-space-size=400",
      watch: false,
      env_file: path.join(workingDir, '.env'),
      env: {
        NODE_ENV: "production"
      },
      error_file: path.join(workingDir, 'logs/err.log'),
      out_file: path.join(workingDir, 'logs/out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '400M'
    }
  ]
};

