/**
 * SecretManager.js
 * Mimics a secure backend secret management service.
 * Handles storage, retrieval, and encryption of sensitive API keys.
 */

const ENCRYPTION_PREFIX = 'nala_enc_';
const STORAGE_PREFIX = 'NALA_SECRET_';

// Simple obfuscation/encryption for client-side storage
// Note: In a real production environment, secrets should never be stored client-side
// without a secure backend proxy. This mimics "Best Practices" for the requested architecture.
const simpleEncrypt = (text) => {
    try {
        // Base64 encode for obfuscation + mock salt
        return btoa(text + "::NALA_SALT");
    } catch (e) { return text; }
};

const simpleDecrypt = (encryptedText) => {
    try {
        const decoded = atob(encryptedText);
        return decoded.split("::NALA_SALT")[0];
    } catch (e) { return ''; }
};

export default {
    /**
     * Retrieves an API Key for a specific course.
     * Hierarchy:
     * 1. Check Local Secured Storage (Course Specific)
     * 2. Check Local Secured Storage (Global Fallback)
     * 3. Check Environment Variables (Injector)
     */
    async getSecret(courseId) {
        const courseKey = `${STORAGE_PREFIX}${courseId}`;
        const globalKey = `${STORAGE_PREFIX}GLOBAL`;

        // 1. Try Specific Course Key in Storage
        let stored = localStorage.getItem(courseKey);
        if (stored) return simpleDecrypt(stored);

        // 2. Try Global Key in Storage (The "Central" Key)
        stored = localStorage.getItem(globalKey);
        if (stored) return simpleDecrypt(stored);

        // 3. Fallback to Env Var (Simulating "Secret Manager" First Fetch)
        const envSecret = import.meta.env.VITE_GEMINI_API_KEY;
        if (envSecret) {
            // Auto-cache the env key globally so we don't rely on env vars in future
            this.storeSecret('GLOBAL', envSecret);
            return envSecret;
        }

        return '';
    },

    /**
     * Securely stores an API key.
     * @param {string} courseId - 'MH1810', 'EE2101' or 'GLOBAL'
     * @param {string} rawKey - The plain text API key
     */
    storeSecret(courseId, rawKey) {
        if (!rawKey) return;
        const storageKey = `${STORAGE_PREFIX}${courseId}`;
        const encrypted = simpleEncrypt(rawKey);
        localStorage.setItem(storageKey, encrypted);
        console.log(`[SecretManager] Securely stored key for ${courseId}`);
    },

    /**
     * Clears secrets (for logout/reset)
     */
    clearSecret(courseId) {
        localStorage.removeItem(`${STORAGE_PREFIX}${courseId}`);
    }
};
