/**
 * Secure API Client configuration
 */

// Uses the base URL from environment variables, or falls back to standard proxy endpoint
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Basic input sanitization to prevent XSS in text inputs before sending to server.
 * Replaces HTML tags with safe characters.
 */
export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
};

/**
 * Sanitizes an entire object's string values (useful for forms)
 */
export const sanitizePayload = (payload) => {
    if (typeof payload !== 'object' || payload === null) return payload;
    
    const sanitized = Array.isArray(payload) ? [] : {};
    for (const key in payload) {
        if (typeof payload[key] === 'string') {
            sanitized[key] = sanitizeInput(payload[key]);
        } else if (typeof payload[key] === 'object') {
            sanitized[key] = sanitizePayload(payload[key]);
        } else {
            sanitized[key] = payload[key];
        }
    }
    return sanitized;
};

/**
 * Common fetch wrapper that automatically adds Auth headers
 */
export const fetchApi = async (endpoint, options = {}) => {
    const token = localStorage.getItem('jwt_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Sanitize body if it's being sent as JSON
    let body = options.body;
    if (body && typeof body === 'string' && headers['Content-Type'] === 'application/json') {
        try {
            const parsed = JSON.parse(body);
            body = JSON.stringify(sanitizePayload(parsed));
        } catch (e) {
            // Ignore parse errors, just send as is if not JSON
        }
    } else if (body && typeof body === 'object') {
        body = JSON.stringify(sanitizePayload(body));
    }

    const config = {
        ...options,
        headers,
        body
    };

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            // Handle common status codes like 401 Unauthorized
            if (response.status === 401) {
                // E.g., clear token and redirect to login
                localStorage.removeItem('jwt_token');
                window.dispatchEvent(new Event('auth:unauthorized'));
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        // Handle empty responses
        if (response.status === 204) return null;
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
};

export default {
    fetchApi,
    sanitizeInput,
    sanitizePayload
};
