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
    getMarks: async (studentId, listAll = false) => {
        // Fetch marks and join with courses to get course details (code, name)
        let query = supabase.from('marks').select('*, courses(code, name)');

        if (studentId) {
            query = query.eq('studentId', studentId);
        }

        // functional requirement: Students should only see published marks.
        // Lecturers need to see all marks.
        // We rely on the caller to specify listAll=true (for lecturers) or we default to filtered if checking for specific student?
        // Actually, simpler: if listAll is false, we filter by isPublished: true.
        // But the previous API signature was just (studentId).
        // Let's check how it's used. 
        // Student Dashboard: ApiService.getMarks(user.id) -> should be published only.
        // Lecturer Dashboard: ApiService.getMarks() -> should be all.

        // So:
        if (!listAll) {
            // If we are fetching for a specific student (studentId provided), we probably only want published ones
            // UNLESS the caller explicitly asked for all (e.g. lecturer debugging a specific student).
            // However, Lecturer Dashboard calls getMarks() with no args to get ALL marks for ALL students.

            // Logic refinement:
            // If studentId is present, we assume it's the Student Dashboard unless specified otherwise?
            // No, Lecturer might want to see grades for a specific student.
            // Let's add the filter if listAll is explicitly false. 
            // BEHAVIOR CHANGE: Defaults to showing ALL if listAll not specified? No, safer to hide draft.
            // BUT existing code didn't have this.

            // Let's enforce: calls must specify if they want drafted marks.
            // Defaulting listAll=false means: only published.
            // Existing call: ApiService.getMarks(user.id) -> now returns only published. Correct for Student.
            // Existing call: ApiService.getMarks() -> now returns only published? INCORRECT for Lecturer.

            // So we need to update Lecturer Dashboard call to ApiService.getMarks(null, true) or similar.
            // Or better: ApiService.getMarks(studentId, { includeDrafts: boolean })
        }

    },
    // RE-WRITING getMarks to handle arguments better
    getMarks: async (studentId = null, options = { includeDrafts: false }) => {
        let query = supabase.from('marks').select('*, courses(code, name)');

        if (studentId) {
            query = query.eq('studentId', studentId);
        }

        if (!options.includeDrafts) {
            query = query.eq('isPublished', true);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(mark => ({
            ...mark,
            ...(mark.courses ? { code: mark.courses.code, name: mark.courses.name } : {})
        }));
    },

    createMark: async (markData) => {
        const { data, error } = await supabase.from('marks').insert([{
            ...markData,
            id: Date.now().toString(),
            isPublished: markData.isPublished || false // Default to draft
        }]).select().single();
        if (error) throw error;

        // Audit Log
        const currentUser = ApiService.getCurrentUser();
        await ApiService._recordHistory(data.id, null, data, 'Creation', currentUser?.id);

        return data;
    },

    _recordHistory: async (markId, oldValues, newValues, reason, userId) => {
        try {
            await supabase.from('mark_history').insert([{
                markId,
                oldValues,
                newValues,
                changeReason: reason,
                changedBy: userId,
                // created_at defaults to now
            }]);
        } catch (err) {
            console.error("Failed to record mark history", err);
            // Non-blocking error
        }
    },

    updateMark: async (id, updates) => {
        // 1. Fetch current state for Audit
        const { data: oldMark } = await supabase.from('marks').select('*').eq('id', id).single();

        // 2. Perform Update
        const { data, error } = await supabase.from('marks').update(updates).eq('id', id).select().single();
        if (error) throw error;

        // 3. Record History
        if (oldMark) {
            const currentUser = ApiService.getCurrentUser();
            // Calculate what actually changed
            const changes = {};
            // Simple diff logic could be here, but verifying all fields is safer for now
            // Or just store the entire old object vs new object
            await ApiService._recordHistory(id, oldMark, data, 'Update', currentUser?.id);
        }

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
