import { DEFAULT_API_HOST, API_ENDPOINTS } from '../constants/config';

let API_BASE_URL = `${DEFAULT_API_HOST}/api`;

export function setApiBaseUrl(url) {
  API_BASE_URL = url.endsWith('/api') ? url : `${url}/api`;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Server request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Network Config
  setBaseUrl: setApiBaseUrl,
  getBaseUrl: getApiBaseUrl,

  // Auth
  async login(username, password) {
    return request(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Tokens
  async getTokens() {
    return request(API_ENDPOINTS.TOKENS);
  },

  async generateToken() {
    return request(API_ENDPOINTS.GENERATE_TOKEN, {
      method: 'POST',
    });
  },

  async verifyToken(tokenCode) {
    return request(API_ENDPOINTS.VERIFY_TOKEN(tokenCode));
  },

  // Visits
  async checkInVisitor(visitData) {
    return request(API_ENDPOINTS.CHECK_IN, {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  },

  async checkOutVisitor(tokenCode) {
    return request(API_ENDPOINTS.CHECK_OUT, {
      method: 'POST',
      body: JSON.stringify({ token_code: tokenCode }),
    });
  },

  async getVisits(search = '') {
    return request(API_ENDPOINTS.VISITS(search));
  },
};
