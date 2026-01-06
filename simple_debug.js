// Simulate logic
const user = { academicYear: 'Year 2', intake: 'Sept 2024' };
const courses = [
    { code: 'CS101', targetYear: 'Year 1' },
    { code: 'CS201', targetYear: 'Year 2' },
    { code: 'CS301', targetYear: '3' }, // Testing loose match
];
const myModuleCodes = [];
const failedCourseCodes = [];

console.log('User:', user);

courses.forEach(c => {
    // Logic from StudentDashboard.jsx
    const normalizeYear = (str) => String(str || '').replace(/Year\s*/i, '').trim().toLowerCase();
    const courseYear = normalizeYear(c.targetYear);
    const studentYear = normalizeYear(user.academicYear);

    const isInSheet = myModuleCodes.includes(c.code);
    const isRetake = failedCourseCodes.includes(c.code);
    const isYearMatch = !c.targetYear || !user.academicYear || (courseYear === studentYear);

    let willShow = false;

    if (myModuleCodes.length === 0 && !isRetake) {
        willShow = isYearMatch;
        console.log(`[Fallback] Course ${c.code} (${c.targetYear}): Match? ${isYearMatch} (norm: ${courseYear} vs ${studentYear})`);
    } else {
        willShow = isInSheet || isRetake;
        console.log(`[Strict] Course ${c.code}: Match? ${willShow}`);
    }
});
