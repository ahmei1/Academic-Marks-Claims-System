/**
 * API Service for interacting with Supabase backend
 */
import { supabase } from './supabase';

export const ApiService = {
    supabase,
    // Auth & Users
    login: async (id, password) => {
        // Mock auth login using the 'users' table
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('regNumber', id)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error('Invalid credentials');
        }

        // Persist user session to localStorage
        localStorage.setItem('user', JSON.stringify(data));
        return data;
    },

    register: async (userData) => {
        // Check if user already exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('regNumber', userData.regNumber)
            .maybeSingle();

        if (existing) {
            throw new Error('User with this Registration Number already exists');
        }

        const { data, error } = await supabase.from('users').insert([{
            ...userData,
            id: Date.now().toString(), // Simple ID generation
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw error;

        // Auto-login after registration
        localStorage.setItem('user', JSON.stringify(data));
        return data;
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    logout: () => {
        localStorage.removeItem('user');
    },

    getUsers: async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data;
    },

    // Courses
    getCourses: async (filters = {}) => {
        let query = supabase.from('courses').select('*');
        if (filters.lecturerId) {
            query = query.eq('lecturerId', filters.lecturerId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    createCourse: async (courseData) => {
        const { data, error } = await supabase.from('courses').insert([{
            ...courseData,
            id: Date.now().toString()
        }]).select().single();
        if (error) throw error;
        return data;
    },

    updateCourse: async (id, updates) => {
        const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteCourse: async (id) => {
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // Marks
    getMarks: async (studentId) => {
        // Fetch marks and join with courses to get course details (code, name)
        let query = supabase.from('marks').select('*, courses(code, name)');
        if (studentId) {
            query = query.eq('studentId', studentId);
        }
        const { data, error } = await query;
        if (error) throw error;

        // Flatten the structure to match what the frontend expects if necessary
        // The frontend might expect: { ...mark, code: '...', name: '...' }
        // Currently Supabase returns: { ...mark, courses: { code: '...', name: '...' } }
        // Let's map it to keep frontend happy if it relies on flat properties, 
        // OR we'll verify if frontend handles the nested object. 
        // Looking at previous Dashboard code, it likely accessed `mark.courseName` or similar if it was flattened before.
        // But in `json-server` implementation, `getMarks` returned raw marks. 
        // The frontend `StudentDashboard.jsx` was doing:
        // `const marks = await ApiService.getMarks(user.id);`
        // `const courses = await ApiService.getCourses();`
        // And then mapping manually? 
        // Let's check StudentDashboard.jsx content in next turn if needed. 
        // For now, let's just return data. The existing `json-server` didn't do joins.
        return data.map(mark => ({
            ...mark,
            // If the join works:
            ...(mark.courses ? { code: mark.courses.code, name: mark.courses.name } : {})
        }));
    },

    createMark: async (markData) => {
        const { data, error } = await supabase.from('marks').insert([{
            ...markData,
            id: Date.now().toString()
        }]).select().single();
        if (error) throw error;
        return data;
    },

    updateMark: async (id, updates) => {
        const { data, error } = await supabase.from('marks').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // Claims
    getClaims: async (filters = {}) => {
        let query = supabase.from('claims').select('*');

        if (filters.studentId) {
            query = query.eq('studentId', filters.studentId);
        }

        if (filters.lecturerId) {
            // Inner join to filter by lecturer's courses
            const { data, error } = await supabase
                .from('claims')
                .select('*, courses!inner(lecturerId)')
                .eq('courses.lecturerId', filters.lecturerId);

            if (error) throw error;
            return data;
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    createClaim: async (claimData) => {
        const { data, error } = await supabase.from('claims').insert([{
            ...claimData,
            id: 'claim_' + Date.now(),
            status: 'pending',
            submittedAt: new Date().toISOString()
        }]).select().single();
        if (error) throw error;
        return data;
    },

    updateClaim: async (id, updates) => {
        const { data, error } = await supabase.from('claims').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // Enrollments
    joinCourse: async (enrollmentData) => {
        const { data: existing } = await supabase
            .from('enrollments')
            .select('*')
            .eq('studentId', enrollmentData.studentId)
            .eq('courseId', enrollmentData.courseId)
            .maybeSingle();

        if (existing) return existing;

        const { data, error } = await supabase.from('enrollments').insert([{
            ...enrollmentData,
            id: Date.now().toString(),
            joinedAt: new Date().toISOString()
        }]).select().single();

        if (error) throw error;
        return data;
    },

    getEnrollments: async (filters = {}) => {
        let query = supabase.from('enrollments').select('*');
        if (filters.studentId) query = query.eq('studentId', filters.studentId);
        if (filters.courseId) query = query.eq('courseId', filters.courseId);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }
};
