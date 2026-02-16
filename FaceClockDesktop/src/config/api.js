// API Configuration
// In development, use localhost. In production, use your server URL
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5000/api';

export default API_BASE_URL;

