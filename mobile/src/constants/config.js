// Backend API Configuration
// Wi-Fi Local IP allows standalone APK on phone to connect to computer over Wi-Fi
// For USB debugging with adb reverse, localhost:5000 is also supported
export const DEFAULT_API_HOST = 'http://10.10.172.216:5000';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  LOGIN: '/auth/login',
  TOKENS: '/tokens',
  GENERATE_TOKEN: '/tokens/generate',
  VERIFY_TOKEN: (code) => `/tokens/${encodeURIComponent(code)}`,
  CHECK_IN: '/visits/check-in',
  CHECK_OUT: '/visits/check-out',
  VISITS: (search = '') => `/visits?search=${encodeURIComponent(search)}`,
};
