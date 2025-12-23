/**
 * Calculate total mark from components
 * @param {number} cat - Continuous Assessment Test
 * @param {number} fat - Final Assessment Test
 * @param {number} assignment - Assignment Score
 * @returns {number} Total Score (0-100)
 */
export const calculateTotalMark = (cat, fat, assignment) => {
    const c = parseFloat(cat) || 0;
    const f = parseFloat(fat) || 0;
    const a = parseFloat(assignment) || 0;
    return Number((c + f + a).toFixed(2));
};

/**
 * Determine grade from score
 * @param {number} total 
 * @returns {string} Grade (A, B, C, D, F)
 */
export const getGrade = (total) => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    return 'F';
};
