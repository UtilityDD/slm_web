import CryptoJS from 'crypto-js';

// Simple salt/secret for encryption. 
// In a high-security environment, this would be more dynamic.
const SECRET_KEY = 'slm_safety_vault_key_2026';

/**
 * Secure Storage Utility
 * Encrypts data before storing in localStorage
 */
const secureStorage = {
    /**
     * Store data securely
     * @param {string} key 
     * @param {any} value 
     */
    setItem: (key, value) => {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const encrypted = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
            localStorage.setItem(key, encrypted);
        } catch (error) {
            console.error('SecureStorage encryption error:', error);
        }
    },

    /**
     * Retrieve and decrypt data
     * @param {string} key 
     * @returns {any|null}
     */
    getItem: (key) => {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;

            const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedString) return null;

            try {
                return JSON.parse(decryptedString);
            } catch {
                return decryptedString;
            }
        } catch (error) {
            console.error('SecureStorage decryption error:', error);
            return null;
        }
    },

    /**
     * Remove item
     * @param {string} key 
     */
    removeItem: (key) => {
        localStorage.removeItem(key);
    },

    /**
     * Clear all (caution)
     */
    clear: () => {
        localStorage.clear();
    }
};

export default secureStorage;
