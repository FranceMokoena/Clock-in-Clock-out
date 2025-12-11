// api.js
// Production-only API configuration
// All requests point to the EC2 backend. No local URLs, no emulator hacks.

const API_BASE_URL = 'https://clock-in.duckdns.org/api';

console.log('🌐 API Base URL (production only):', API_BASE_URL);

export default API_BASE_URL;
