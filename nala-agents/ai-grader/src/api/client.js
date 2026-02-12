
import axios from 'axios';

/**
 * Centralized API Client (Rule #1)
 * Wraps network requests with standard headers and error handling.
 */

const apiClient = axios.create({
    baseURL: '/ee2101/api', // Relative path to be proxied by Vite
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30s timeout for AI operations
});

// Request Interceptor (e.g., for future JWT injection)
apiClient.interceptors.request.use(config => {
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, error => Promise.reject(error));

// Response Interceptor (Error Normalization)
apiClient.interceptors.response.use(
    response => response.data, // Return data directly
    error => {
        const message = error.response?.data?.error || error.message || "Network Error";
        console.error("[API Client] Error:", message);
        return Promise.reject(new Error(message));
    }
);

export default {
    get: (url, config) => apiClient.get(url, config),
    post: (url, data, config) => apiClient.post(url, data, config),
    put: (url, data, config) => apiClient.put(url, data, config),
    delete: (url, config) => apiClient.delete(url, config),
    // Specific user fetcher for cross-service call
    getUser: (userId) => apiClient.get(`/user/me?userId=${userId}`)
};
