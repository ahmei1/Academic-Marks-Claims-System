/**
 * Mock Data Service
 * Simulates a backend database using localStorage
 */

const STORAGE_KEYS = {
    USERS: 'app_users',
    COURSES: 'app_courses',
    MARKS: 'app_marks',
    CLAIMS: 'app_claims',
    CURRENT_USER: 'app_current_user'
};

// Initial Seed Data
const SEED_DATA = {
    users: [
        { id: 'u1', name: 'John Doe', email: 'student@univ.edu', role: 'student', password: 'password' },
        { id: 'u2', name: 'Dr. Smith', email: 'lecturer@univ.edu', role: 'lecturer', password: 'password' }
    ],
    courses: [
        { id: 'c1', code: 'CS101', name: 'Intro to Computer Science', lecturerId: 'u2' },
        { id: 'c2', code: 'MATH202', name: 'Advanced Mathematics', lecturerId: 'u2' }
    ],
    marks: [
        { id: 'm1', studentId: 'u1', courseId: 'c1', cat: 25, fat: 60, assignment: 10, total: 95 },
        { id: 'm2', studentId: 'u1', courseId: 'c2', cat: 20, fat: 50, assignment: 8, total: 78 }
    ],
    claims: []
};

// Helper: Initialize data if empty
const initializeData = () => {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_DATA.users));
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(SEED_DATA.courses));
        localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify(SEED_DATA.marks));
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(SEED_DATA.claims));
        console.log('Mock Data Initialized');
    }
};

initializeData();

export const MockDataService = {
    getUsers: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
    getCourses: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]'),
    getMarks: (studentId) => {
        const allMarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.MARKS) || '[]');
        return studentId ? allMarks.filter(m => m.studentId === studentId) : allMarks;
    },
    getClaims: (filters = {}) => {
        let claims = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLAIMS) || '[]');
        if (filters.studentId) claims = claims.filter(c => c.studentId === filters.studentId);
        if (filters.lecturerId) {
            // Get courses for lecturer, then filter claims for those courses
            const courses = MockDataService.getCourses().filter(c => c.lecturerId === filters.lecturerId);
            const courseIds = courses.map(c => c.id);
            claims = claims.filter(c => courseIds.includes(c.courseId));
        }
        return claims;
    },

    createClaim: (claimData) => {
        const claims = MockDataService.getClaims();
        const newClaim = {
            id: 'claim_' + Date.now(),
            status: 'pending',
            submittedAt: new Date().toISOString(),
            ...claimData
        };
        claims.push(newClaim);
        localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
        return newClaim;
    },

    updateClaim: (claimId, updates) => {
        const claims = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLAIMS) || '[]');
        const index = claims.findIndex(c => c.id === claimId);
        if (index !== -1) {
            claims[index] = { ...claims[index], ...updates };
            localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
            return claims[index];
        }
        return null;
    },

    updateMark: (markId, newScores) => {
        const marks = JSON.parse(localStorage.getItem(STORAGE_KEYS.MARKS) || '[]');
        const index = marks.findIndex(m => m.id === markId);
        if (index !== -1) {
            marks[index] = { ...marks[index], ...newScores };
            // Recalculate total if needed, simple sum for now
            marks[index].total = (marks[index].cat || 0) + (marks[index].fat || 0) + (marks[index].assignment || 0);
            localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify(marks));
            return marks[index];
        }
        return null;
    }
};

export const AuthService = {
    login: (email, password) => {
        const users = MockDataService.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout: () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },
    getCurrentUser: () => {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    }
};
