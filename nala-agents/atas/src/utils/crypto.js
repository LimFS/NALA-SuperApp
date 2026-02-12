import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const ALGORITHM = 'aes-256-cbc';
// Use a fixed key for demo/dev if not provided (In prod, MUST be 32 bytes hex in env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : crypto.scryptSync('nala-super-secret-password', 'salt', 32);

const IV_LENGTH = 16;

export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: iv:encryptedData
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const encryptDeterministic = (text) => {
    if (!text) return null;
    // Create a deterministic IV (e.g., md5 of text+key, or just a fixed IV if we want pure equality)
    // SECURITY NOTE: For exact match search, we need the SAME IV every time for the same Text.
    // However, reusing IV is weak against frequency analysis. But strictly required for searchable encryption without a search index.
    // We will use a Hash(Text + Key) as the IV? No, IV must be available to decrypt.
    // Wait, if we use Hash(Text) as IV, then we can decrypt.
    // But `encryptDeterministic` output must be consistent.
    // Actually, for `WHERE email = ?`, we just need the output to be the same.
    // We can use a fixed IV for the column, or deriving IV from the text itself.
    // Let's derive IV from HMAC(key, text).
    const iv = crypto.createHmac('sha256', ENCRYPTION_KEY).update(text).digest().subarray(0, IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.warn("Decryption failed:", e.message);
        return text; // Return original if fail (fallback for unencrypted legacy data)
    }
};
