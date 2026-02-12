
import crypto from 'crypto';

/**
 * Generates a Universal Domain Identity (UDI)
 * Format: UDI-<ShortHash>-<CourseId>-<Year>
 * e.g., UDI-8829-EE2101-2025
 * 
 * @param {string} userId - The student's system ID (e.g. 'u123')
 * @param {string} courseCode - The course code (e.g. 'EE2101')
 * @param {string} salt - Optional salt for rotation (default: process.env.UDI_SALT)
 */
export const generateUDI = (userId, courseCode, academicYear, semester, salt = 'ANTI_GRAVITY_v1') => {
    const raw = `${userId}:${courseCode}:${academicYear}:${semester}:${salt}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const shortHash = hash.substring(0, 4).toUpperCase();

    // 0. Special Case: Del Spooner (Removed per Engineering Review - Use Standard Hashing)
    // if (userId.toLowerCase().includes('del') ...)

    // 1. Create a Year-Specific Salt (Rotates annually)
    const year = academicYear.replace(/[^0-9]/g, '');

    return `UDI-${shortHash}-${courseCode}-${year}-${semester}`;
};
