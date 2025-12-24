/**
 * Calculate total mark from components
 * @param {number} cat - Continuous Assessment Test
 * @param {number} fat - Final Assessment Test
 * @param {number} assignment - Assignment Score
 * @returns {number} Total Score (0-100)
 */
export const calculateTotalMark = (cat, fat, individualAssignment, groupAssignment, quiz, attendance) => {
    const c = parseFloat(cat) || 0;
    const f = parseFloat(fat) || 0;
    const i = parseFloat(individualAssignment) || 0;
    const g = parseFloat(groupAssignment) || 0;
    const q = parseFloat(quiz) || 0;
    const att = parseFloat(attendance) || 0;

    return Number((c + f + i + g + q + att).toFixed(2));
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
