require('dotenv').config();
const path = require('path');

// Determine working directory - use absolute path for EC2, relative for local
const isProduction = process.env.NODE_ENV === 'production';
const workingDir = isProduction 
  ? '/home/ubuntu/FaceClockBackend' 
  : path.join(__dirname);

module.exports = {
  apps: [
    {
      name: "faceclock",
      script: "server.js",
      cwd: workingDir,
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: "production"
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '400M'
    }
  ]
};

