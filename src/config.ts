// Single source of truth for the API base URL.
// In development: uses VITE_API_URL from .env (defaults to localhost:4000)
// In production: Docker container sets VITE_API_URL=/api, which Nginx proxies to the backend
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
export default API_URL;
