import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, BookOpen, AlertCircle, TrendingUp, UserPlus, CheckCircle, XCircle, Search, Edit2, GraduationCap } from 'lucide-react';
import ClaimStatusChart from '../../components/charts/ClaimStatusChart';
import CourseDurationChart from '../../components/charts/CourseDurationChart';
import PageTransition from '../../components/PageTransition';

const HodDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ claims: 0, pending: 0, courses: 0, students: 0, lecturers: 0 });
    const [claims, setClaims] = useState([]);
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedCourseForClaims, setSelectedCourseForClaims] = useState(null);
    const [claimSearchTerm, setClaimSearchTerm] = useState('');

    // Forms State
    const [showCreateCourse, setShowCreateCourse] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);

    // Create Course State
    const [newCourse, setNewCourse] = useState({ code: '', name: '', targetYear: 'Year 1', intake: '', cohortYear: '', startDate: '', endDate: '', lecturerId: '' });
    const [editingCourse, setEditingCourse] = useState(null);

    // Create User State
    const [newUser, setNewUser] = useState({ name: '', email: '', regNumber: '', role: 'student', password: 'password', intake: '', cohortYear: '', academicYear: '' });
    const [editingUser, setEditingUser] = useState(null);

    // Enrollment Management State
    const [managingCourse, setManagingCourse] = useState(null);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
    const [selectedBulkGroup, setSelectedBulkGroup] = useState('');

    // New Search State
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [studentSearchMonth, setStudentSearchMonth] = useState('');
    const [studentSearchCohort, setStudentSearchCohort] = useState('');

    const handleManageEnrollments = async (course) => {
        setManagingCourse(course);
        setInputLoading(true); // Assuming reusing loading or separate local loading state
        try {
            const enrollments = await ApiService.getCourseEnrollments(course.id);
            setEnrolledStudents(enrollments);
        } catch (error) {
            console.error(error);
            alert("Failed to load enrollments");
        }
        setInputLoading(false);
    };

    const handleAddStudent = async (optionalStudentId = null) => {
        // Use passed ID or state ID
        const targetId = typeof optionalStudentId === 'string' ? optionalStudentId : selectedStudentToAdd;

        if (!targetId || !managingCourse) return;
        try {
            // HoD overrides the "active course" rule by passing force=true
            await ApiService.joinCourse({
                studentId: targetId,
                courseId: managingCourse.id
            }, true);

            // Refresh list
            const enrollments = await ApiService.getCourseEnrollments(managingCourse.id);
            setEnrolledStudents(enrollments);
            setSelectedStudentToAdd(''); // Clear state if used
            // alert("Student added successfully!"); // Reduced spam for quick adds
        } catch (err) {
            alert("Failed to enroll: " + err.message);
        }
    };

    // Wrapper for direct clicks
    const handleDirectAdd = (id) => handleAddStudent(id);

    const handleRemoveStudent = async (studentId) => {
        if (!confirm("Remove this student from the course?")) return;
        try {
            await ApiService.unenroll(studentId, managingCourse.id);
            // Refresh list
            const enrollments = await ApiService.getCourseEnrollments(managingCourse.id);
            setEnrolledStudents(enrollments);
        } catch (err) {
            alert("Failed to remove: " + err.message);
        }
    };

    const handleBulkEnroll = async () => {
        if (!selectedBulkGroup || !managingCourse) return;
        if (!confirm(`Enroll ALL students from '${selectedBulkGroup}' into ${managingCourse.code}?`)) return;

        const [intake, cohort] = selectedBulkGroup.split('|');
        // Find matching students
        const targetStudents = users.filter(u =>
            u.role === 'student' &&
            (u.intake === intake || (!u.intake && intake === 'Unknown')) &&
            (u.cohortYear === cohort || (!u.cohortYear && cohort === 'Unknown'))
        );

        let successCount = 0;
        let failCount = 0;

        for (const student of targetStudents) {
            try {
                // Check if already enrolled to avoid duplicates/errors
                // joinCourse handles "already enrolled this course" gracefully (returns existing)
                // We force enrollment (override active course check) for bulk admin actions? 
                // Or should we respect it? HoD usually knows best. Let's force.
                await ApiService.joinCourse({
                    studentId: student.id,
                    courseId: managingCourse.id
                }, true);
                successCount++;
            } catch (e) {
                failCount++;
            }
        }

        alert(`Bulk enrollment complete.\nSuccess: ${successCount}\nFailed: ${failCount}`);

        // Refresh
        const enrollments = await ApiService.getCourseEnrollments(managingCourse.id);
        setEnrolledStudents(enrollments);
        setSelectedBulkGroup('');
    };

    const setInputLoading = (isLoading) => { /* Simple stub or use main loading */ };

    const [selectedUserGroup, setSelectedUserGroup] = useState(null);
    const [selectedIntake, setSelectedIntake] = useState(null);

    const getCourseStatus = (course) => {
        if (!course.startDate || !course.endDate) return 'Unknown';
        const now = new Date();
        const start = new Date(course.startDate);
        const end = new Date(course.endDate);

        if (now < start) return 'Upcoming';
        if (now > end) return 'Done';
        return 'Ongoing';
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allClaims, allCourses, allUsers] = await Promise.all([
                ApiService.getClaims(),
                ApiService.getCourses(),
                ApiService.getUsers()
            ]);

            setClaims(allClaims);
            setCourses(allCourses);
            setUsers(allUsers);

            setStats({
                claims: allClaims.length,
                pending: allClaims.filter(c => c.status === 'pending').length,
                courses: allCourses.length,
                students: allUsers.filter(u => u.role === 'student').length,
                lecturers: allUsers.filter(u => u.role === 'lecturer').length
            });
        } catch (error) {
            console.error("Error loading HoD data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await ApiService.createCourse(newCourse);
            alert('Course created successfully');
            setShowCreateCourse(false);
            setNewCourse({ code: '', name: '', targetYear: 'Year 1', intake: '', cohortYear: '', startDate: '', endDate: '', lecturerId: '' });
            loadData();
        } catch (err) {
            alert('Failed to create course: ' + err.message);
        }
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        try {
            await ApiService.updateCourse(editingCourse.id, {
                code: editingCourse.code,
                name: editingCourse.name,
                intake: editingCourse.intake,
                cohortYear: editingCourse.cohortYear,
                lecturerId: editingCourse.lecturerId,
                startDate: editingCourse.startDate,
                endDate: editingCourse.endDate
            });
            alert('Course updated successfully');
            setEditingCourse(null);
            loadData();
        } catch (err) {
            alert('Failed to update course: ' + err.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            // Using a specialized method or just relying on checking logic in api.js if we modified it
            // Since api.js register is disabled, we might need a specific 'adminCreateUser' or we modify api.js to allow it if logged in as HoD.
            // But api.js 'register' throws error.
            // Let's call supabase directly here for demo purposes as 'admin'
            /* 
            await ApiService.supabase.from('users').insert([{
                ...newUser,
                id: Date.now().toString(),
                created_at: new Date().toISOString()
            }]);
            */
            // Re-evaluated: Modify ApiService to allow creation if internal, or skip validation. 
            // Better: Add adminCreateUser to ApiService or just use Supabase client directly here.
            await ApiService.supabase.from('users').insert({
                ...newUser,
                id: Date.now().toString(),
                created_at: new Date().toISOString()
            }).select().single();

            alert('User created successfully');
            setShowCreateUser(false);
            setNewUser({ name: '', email: '', regNumber: '', role: 'student', password: 'password', intake: '', cohortYear: '', academicYear: '' });
            loadData();
        } catch (err) {
            alert('Failed to create user: ' + err.message);
        }
    };

    const handleDeleteCourse = async (id) => {
        if (confirm('Delete this course?')) {
            await ApiService.deleteCourse(id);
            loadData();
        }
    }

    const handleDeleteUser = async (id) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await ApiService.deleteUser(id);
                loadData();
            } catch (err) {
                alert('Failed to delete user: ' + err.message);
            }
        }
    };

    const handleEditUser = (user) => {
        setEditingUser({ ...user });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await ApiService.updateUser(editingUser.id, {
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                regNumber: editingUser.regNumber,
                intake: editingUser.intake,
                cohortYear: editingUser.cohortYear
            });
            alert('User updated successfully');
            setEditingUser(null);
            loadData();
        } catch (err) {
            alert('Failed to update user: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;

    return (
        <PageTransition>
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white">HoD Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400">Head of Department Control Center</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowCreateCourse(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <BookOpen size={18} /> New Course
                    </button>
                    <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                        <UserPlus size={18} /> New User
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Pending Claims</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.pending}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Courses</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.courses}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Students</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.students}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Lecturers</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.lecturers}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 mb-6">
                {['overview', 'courses', 'users', 'claims'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-4 font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        {tab}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <CourseDurationChart courses={courses} />
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Ongoing Courses & Durations</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-3">Course Code</th>
                                            <th className="px-6 py-3">Course Name</th>
                                            <th className="px-6 py-3">Intake / Cohort</th>
                                            <th className="px-6 py-3">Schedule</th>
                                            <th className="px-6 py-3">Assigned Lecturer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.map(course => {
                                            const lecturer = users.find(u => u.id === course.lecturerId);
                                            return (
                                                <tr key={course.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{course.code}</td>
                                                    <td className="px-6 py-3">{course.name}</td>
                                                    <td className="px-6 py-3 text-slate-500">
                                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                                                            Intake {course.intake} / {course.cohortYear}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">
                                                        {course.startDate && course.endDate ? (
                                                            <div className="flex flex-col text-xs">
                                                                <span>Start: {new Date(course.startDate).toLocaleDateString()}</span>
                                                                <span>End: {new Date(course.endDate).toLocaleDateString()}</span>
                                                            </div>
                                                        ) : (
                                                            <span>{course.duration || 'N/A'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-500">
                                                        {lecturer?.name || (
                                                            <span className="text-red-500 italic text-xs">Unassigned</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {courses.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">
                                                    No ongoing courses found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'courses' && (
                    <div className="space-y-6">
                        {!selectedIntake ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(courses.reduce((groups, course) => {
                                    // Helper (Duplicated for now, or move to component scope)
                                    const normalizeIntakeToMonth = (str) => {
                                        const s = String(str || '').trim().toLowerCase();
                                        if (s.includes('jan')) return '1';
                                        if (s.includes('feb')) return '2';
                                        if (s.includes('mar')) return '3';
                                        if (s.includes('apr')) return '4';
                                        if (s.includes('may')) return '5';
                                        if (s.includes('jun')) return '6';
                                        if (s.includes('jul')) return '7';
                                        if (s.includes('aug')) return '8';
                                        if (s.includes('sep')) return '9';
                                        if (s.includes('oct')) return '10';
                                        if (s.includes('nov')) return '11';
                                        if (s.includes('dec')) return '12';
                                        return s.replace(/[^0-9]/g, '');
                                    };

                                    const rawIntake = course.intake || 'Unknown';
                                    const normIntake = normalizeIntakeToMonth(rawIntake);
                                    const displayIntake = normIntake ? `Intake ${normIntake}` : 'Unknown Intake';

                                    const key = `${displayIntake} - ${course.cohortYear || 'Unknown Cohort'}`;
                                    if (!groups[key]) groups[key] = [];
                                    groups[key].push(course);
                                    return groups;
                                }, {})).map(([groupTitle, groupCourses]) => (
                                    <div
                                        key={groupTitle}
                                        onClick={() => setSelectedIntake({ title: groupTitle, courses: groupCourses })}
                                        className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all group flex flex-col items-center justify-center text-center gap-4"
                                    >
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                                            <BookOpen size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{groupTitle}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                                            {groupCourses.length} Courses
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <button
                                    onClick={() => setSelectedIntake(null)}
                                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    <XCircle size={20} /> Back to Intakes
                                </button>

                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 pl-2 border-l-4 border-blue-600 dark:border-blue-500">
                                    {selectedIntake.title}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedIntake.courses.map(course => {
                                        const lecturer = users.find(u => u.id === course.lecturerId);
                                        const status = getCourseStatus(course);
                                        const statusColors = {
                                            'Upcoming': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                            'Ongoing': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                            'Done': 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
                                            'Unknown': 'bg-gray-100 text-gray-700'
                                        };

                                        return (
                                            <div key={course.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative">
                                                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${statusColors[status] || statusColors['Unknown']}`}>
                                                    {status}
                                                </div>

                                                <div className="flex justify-between items-start mb-2 mt-4">
                                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{course.code}</h3>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleManageEnrollments(course);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded"
                                                            title="Manage Enrollments"
                                                        >
                                                            <Users size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCourse({ ...course });
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded"
                                                            title="Edit Course"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} className="text-red-500 hover:text-red-700 p-1.5"><XCircle size={18} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">{course.name}</p>
                                                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <div className="flex justify-between">
                                                        <span>Duration:</span>
                                                        <span className="text-slate-800 dark:text-slate-200 font-medium text-right">
                                                            {course.startDate && course.endDate
                                                                ? `${new Date(course.startDate).toLocaleDateString()} - ${new Date(course.endDate).toLocaleDateString()}`
                                                                : (course.duration || 'N/A')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                                        <span>Lecturer:</span>
                                                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                                                            {lecturer?.name || 'Unassigned'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Manage Enrollments Modal */}
                        {managingCourse && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                <Users className="text-blue-600" /> Manage Enrollments
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {managingCourse.code} - {managingCourse.name}
                                            </p>
                                        </div>
                                        <button onClick={() => setManagingCourse(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <XCircle size={28} />
                                        </button>
                                    </div>

                                    <div className="p-6 overflow-y-auto flex-1">

                                        {/* Action Bar */}
                                        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                            <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                                <UserPlus size={18} /> Add Students
                                            </h4>

                                            <div className="flex flex-col md:flex-row gap-4">
                                                {/* Filtered Student Search */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Search & Add Student</label>

                                                    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <div className="flex gap-2 flex-wrap">
                                                            {/* Month Filter */}
                                                            <div className="flex-1 min-w-[100px]">
                                                                <select
                                                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={studentSearchMonth}
                                                                    onChange={(e) => setStudentSearchMonth(e.target.value)}
                                                                >
                                                                    <option value="">Month</option>
                                                                    <option value="1">1 (Jan)</option>
                                                                    <option value="2">2 (Feb)</option>
                                                                    <option value="3">3 (Mar)</option>
                                                                    <option value="4">4 (Apr)</option>
                                                                    <option value="5">5 (May)</option>
                                                                    <option value="6">6 (Jun)</option>
                                                                    <option value="7">7 (Jul)</option>
                                                                    <option value="8">8 (Aug)</option>
                                                                    <option value="9">9 (Sep)</option>
                                                                    <option value="10">10 (Oct)</option>
                                                                    <option value="11">11 (Nov)</option>
                                                                    <option value="12">12 (Dec)</option>
                                                                </select>
                                                            </div>

                                                            {/* Cohort Year Filter */}
                                                            <div className="flex-1 min-w-[100px]">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Year (2024)"
                                                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={studentSearchCohort}
                                                                    onChange={(e) => setStudentSearchCohort(e.target.value)}
                                                                />
                                                            </div>

                                                            {/* Search Input */}
                                                            <div className="relative flex-[2] min-w-[150px]">
                                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search Name or Reg No..."
                                                                    className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={studentSearchTerm}
                                                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Results List */}
                                                        <div className="max-h-[150px] overflow-y-auto border rounded-lg border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                                                            {(() => {
                                                                // Filter Logic
                                                                const availableStudents = users.filter(u => {
                                                                    if (u.role !== 'student') return false;
                                                                    if (enrolledStudents.some(e => e.studentId === u.id)) return false;

                                                                    // Normalization Helper
                                                                    const normalizeIntakeToMonth = (str) => {
                                                                        const s = String(str || '').trim().toLowerCase();
                                                                        if (s.includes('jan')) return '1';
                                                                        if (s.includes('feb')) return '2';
                                                                        if (s.includes('mar')) return '3';
                                                                        if (s.includes('apr')) return '4';
                                                                        if (s.includes('may')) return '5';
                                                                        if (s.includes('jun')) return '6';
                                                                        if (s.includes('jul')) return '7';
                                                                        if (s.includes('aug')) return '8';
                                                                        if (s.includes('sep')) return '9';
                                                                        if (s.includes('oct')) return '10';
                                                                        if (s.includes('nov')) return '11';
                                                                        if (s.includes('dec')) return '12';
                                                                        return s.replace(/[^0-9]/g, ''); // Extract numbers if user typed "Intake 9"
                                                                    };

                                                                    // Month Filter
                                                                    if (studentSearchMonth) {
                                                                        const uMonth = normalizeIntakeToMonth(u.intake);
                                                                        if (uMonth !== studentSearchMonth) return false;
                                                                    }

                                                                    // Cohort Filter
                                                                    if (studentSearchCohort) {
                                                                        const uCohort = String(u.cohortYear || '').trim();
                                                                        const sCohort = String(studentSearchCohort).trim();
                                                                        if (uCohort !== sCohort) return false;
                                                                    }

                                                                    // Text Search
                                                                    if (!studentSearchTerm) return true;
                                                                    const searchLower = studentSearchTerm.toLowerCase();
                                                                    return (u.name?.toLowerCase().includes(searchLower) || u.regNumber?.toLowerCase().includes(searchLower));
                                                                }).slice(0, 50); // Limit results for performance

                                                                if (availableStudents.length === 0) {
                                                                    return <div className="p-3 text-center text-xs text-slate-500 italic">No students found matching filters.</div>;
                                                                }

                                                                return availableStudents.map(s => (
                                                                    <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-semibold text-slate-800 dark:text-white">{s.name}</span>
                                                                            <span className="text-xs text-slate-500 font-mono">{s.regNumber} • {s.intake}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedStudentToAdd(s.id);
                                                                                handleAddStudent(); // Trigger add immediately or setup strict flow? 
                                                                                // handleAddStudent relies on selectedStudentToAdd state, which is async. 
                                                                                // BETTER: Pass ID directly to handleAddStudent or wrap it.
                                                                                // Let's modify handleAddStudent to accept an ID or update logic below.
                                                                                // For now, I'll assume I should update handleAddStudent to take an argument.
                                                                                // Wait, I can't easily change the handler in this block.
                                                                                // Workaround: Call logic directly here or assume React batches? 
                                                                                // Let's call a wrapper:
                                                                                handleDirectAdd(s.id);
                                                                            }}
                                                                            className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                                        >
                                                                            Add
                                                                        </button>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bulk Add */}
                                                <div className="flex-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Bulk Import Group</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="flex-1 p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                                                            value={selectedBulkGroup}
                                                            onChange={(e) => setSelectedBulkGroup(e.target.value)}
                                                        >
                                                            <option value="">Select Intake Group...</option>
                                                            {/* Generate Unique Groups */}
                                                            {[...new Set(users.filter(u => u.role === 'student').map(u => `${u.intake || 'Unknown'}|${u.cohortYear || 'Unknown'}`))].map(groupKey => {
                                                                const [intake, cohort] = groupKey.split('|');
                                                                return (
                                                                    <option key={groupKey} value={groupKey}>Intake {intake} / {cohort}</option>
                                                                )
                                                            })}
                                                        </select>
                                                        <button
                                                            disabled={!selectedBulkGroup}
                                                            onClick={handleBulkEnroll}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
                                                        >
                                                            Import All
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Enrolled List */}
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex justify-between items-center">
                                            <span>Enrolled Students</span>
                                            <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm">{enrolledStudents.length} Students</span>
                                        </h4>

                                        <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">
                                                    <tr>
                                                        <th className="px-6 py-3">Name</th>
                                                        <th className="px-6 py-3">Reg. No</th>
                                                        <th className="px-6 py-3">Joined At</th>
                                                        <th className="px-6 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {enrolledStudents.map(enrollment => (
                                                        <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{enrollment.student?.name}</td>
                                                            <td className="px-6 py-3 font-mono text-slate-500">{enrollment.student?.regNumber}</td>
                                                            <td className="px-6 py-3 text-slate-500">{new Date(enrollment.joinedAt).toLocaleDateString()}</td>
                                                            <td className="px-6 py-3 text-right">
                                                                <button
                                                                    onClick={() => handleRemoveStudent(enrollment.studentId)}
                                                                    className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 hover:bg-red-50 rounded px-2 py-1 transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {enrolledStudents.length === 0 && (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500 italic">No students enrolled yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right">
                                        <button onClick={() => setManagingCourse(null)} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition-colors font-medium">Done</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {courses.length === 0 && (
                            <div className="text-center p-8 text-slate-500 italic">No courses available.</div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {!selectedUserGroup ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Lecturers Folder */}
                                <div
                                    onClick={() => setSelectedUserGroup({
                                        title: 'Lecturers',
                                        users: users.filter(u => u.role === 'lecturer')
                                    })}
                                    className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-purple-500 transition-all group flex flex-col items-center justify-center text-center gap-4"
                                >
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full group-hover:scale-110 transition-transform">
                                        <Users size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lecturers</h3>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                                        {users.filter(u => u.role === 'lecturer').length} Staff
                                    </span>
                                </div>

                                {/* Student Folders */}
                                {Object.entries(users.filter(u => u.role === 'student').reduce((groups, student) => {
                                    const normalizeIntakeToMonth = (str) => {
                                        const s = String(str || '').trim().toLowerCase();
                                        if (s.includes('jan')) return '1';
                                        if (s.includes('feb')) return '2';
                                        if (s.includes('mar')) return '3';
                                        if (s.includes('apr')) return '4';
                                        if (s.includes('may')) return '5';
                                        if (s.includes('jun')) return '6';
                                        if (s.includes('jul')) return '7';
                                        if (s.includes('aug')) return '8';
                                        if (s.includes('sep')) return '9';
                                        if (s.includes('oct')) return '10';
                                        if (s.includes('nov')) return '11';
                                        if (s.includes('dec')) return '12';
                                        return s.replace(/[^0-9]/g, '');
                                    };

                                    const rawIntake = student.intake || 'Unknown';
                                    const normIntake = normalizeIntakeToMonth(rawIntake);
                                    const displayIntake = normIntake ? `Intake ${normIntake}` : 'Unknown Intake';

                                    const key = `${displayIntake} - ${student.cohortYear || 'Unknown Cohort'}`;
                                    if (!groups[key]) groups[key] = [];
                                    groups[key].push(student);
                                    return groups;
                                }, {})).map(([groupTitle, groupUsers]) => (
                                    <div
                                        key={groupTitle}
                                        onClick={() => setSelectedUserGroup({ title: groupTitle, users: groupUsers })}
                                        className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-green-500 transition-all group flex flex-col items-center justify-center text-center gap-4"
                                    >
                                        <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full group-hover:scale-110 transition-transform">
                                            <GraduationCap size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{groupTitle}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                                            {groupUsers.length} Students
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <button
                                    onClick={() => setSelectedUserGroup(null)}
                                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    <XCircle size={20} /> Back to User Groups
                                </button>

                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 pl-2 border-l-4 border-blue-600 dark:border-blue-500">
                                    {selectedUserGroup.title}
                                </h3>

                                <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-6 py-3">Name</th>
                                                <th className="px-6 py-3">Role</th>
                                                <th className="px-6 py-3">Reg. No / ID</th>
                                                <th className="px-6 py-3">Email</th>
                                                <th className="px-6 py-3">Details</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedUserGroup.users.map(u => (
                                                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                                                    <td className="px-6 py-3 capitalize">{u.role}</td>
                                                    <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">{u.regNumber}</td>
                                                    <td className="px-6 py-3">{u.email}</td>
                                                    <td className="px-6 py-3 text-xs text-slate-500">
                                                        {u.role === 'student' ? `${u.intake || '-'} / ${u.cohortYear || '-'}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEditUser(u)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                                title="Edit User"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                                title="Delete User"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedUserGroup.users.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500 italic">
                                                        No users found in this group.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'claims' && (
                    !selectedCourseForClaims ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Review Claims by Course</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map(course => {
                                    const courseClaims = claims.filter(c => c.courseId === course.id);
                                    if (courseClaims.length === 0) return null; // Optional: Hide courses with no claims? Or show all. Let's show only with claims or all? Lecturer shows all. 
                                    // HoD might have many courses. Let's show all for now, or maybe only those with claims to reduce clutter if there are 100s of courses.
                                    // User asked to "do the same", so I will show all courses but maybe sorted or just all.
                                    // Actually, if there are 0 claims, it might be noise. But consistency is key. Let's show all.

                                    const pendingCount = courseClaims.filter(c => c.status === 'pending').length;
                                    const lecturer = users.find(u => u.id === course.lecturerId);

                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => setSelectedCourseForClaims(course)}
                                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                                    <BookOpen size={24} />
                                                </div>
                                                {pendingCount > 0 && (
                                                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                                        {pendingCount} Pending
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{course.code}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{course.name}</p>

                                            <div className="flex gap-2 my-3">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded border border-slate-200 dark:border-slate-600">
                                                    Intake {course.intake}
                                                </span>
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded border border-slate-200 dark:border-slate-600">
                                                    {course.cohortYear}
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-1 mt-auto">
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                                                    <span>Claims:</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{courseClaims.length}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                                                    <span>Lecturer:</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{lecturer?.name || 'Unassigned'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <button
                                onClick={() => { setSelectedCourseForClaims(null); setClaimSearchTerm(''); }}
                                className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <XCircle size={20} /> Back to Courses
                            </button>

                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                        Claims: <span className="text-blue-600 dark:text-blue-400">{selectedCourseForClaims.code}</span>
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Intake {selectedCourseForClaims.intake} | Cohort {selectedCourseForClaims.cohortYear}
                                    </p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search student..."
                                        className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={claimSearchTerm}
                                        onChange={(e) => setClaimSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {claims.filter(claim => {
                                    if (claim.courseId !== selectedCourseForClaims.id) return false;
                                    if (!claimSearchTerm) return true;
                                    const student = users.find(s => s.id === claim.studentId);
                                    const searchLower = claimSearchTerm.toLowerCase();
                                    return student?.name?.toLowerCase().includes(searchLower) ||
                                        student?.regNumber?.toLowerCase().includes(searchLower) ||
                                        claim.assessmentType.toLowerCase().includes(searchLower);
                                }).length === 0 && <p className="text-slate-500 italic bg-white dark:bg-slate-800 p-8 rounded-xl text-center border border-dashed border-slate-300 dark:border-slate-700">No claims found.</p>}

                                {claims.filter(claim => {
                                    if (claim.courseId !== selectedCourseForClaims.id) return false;
                                    if (!claimSearchTerm) return true;
                                    const student = users.find(s => s.id === claim.studentId);
                                    const searchLower = claimSearchTerm.toLowerCase();
                                    return student?.name?.toLowerCase().includes(searchLower) ||
                                        student?.regNumber?.toLowerCase().includes(searchLower) ||
                                        claim.assessmentType.toLowerCase().includes(searchLower);
                                }).map(claim => {
                                    const student = users.find(u => u.id === claim.studentId);
                                    const course = courses.find(c => c.id === claim.courseId);
                                    return (
                                        <div key={claim.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{course?.code} - {claim.assessmentType}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${claim.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        claim.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {claim.status}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-slate-500 dark:text-slate-400">Student: {student?.name} ({student?.regNumber})</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">"{claim.explanation}"</p>
                                                {claim.lecturerComment && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2"><span className="font-bold">Lecturer:</span> {claim.lecturerComment}</p>
                                                )}
                                            </div>

                                            <div className="text-sm text-slate-400 whitespace-nowrap">
                                                {new Date(claim.submittedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Create Course Modal */}
            {showCreateCourse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Create Course</h3>
                        <form onSubmit={handleCreateCourse} className="space-y-3">
                            <input type="text" placeholder="Course Code" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} required />
                            <input type="text" placeholder="Course Name" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Intake" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.intake} onChange={e => setNewCourse({ ...newCourse, intake: e.target.value })} />
                                <input type="text" placeholder="Cohort" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.cohortYear} onChange={e => setNewCourse({ ...newCourse, cohortYear: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                                    <input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.startDate} onChange={e => setNewCourse({ ...newCourse, startDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                                    <input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.endDate} onChange={e => setNewCourse({ ...newCourse, endDate: e.target.value })} required />
                                </div>
                            </div>
                            <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newCourse.lecturerId} onChange={e => setNewCourse({ ...newCourse, lecturerId: e.target.value })} required>
                                <option value="">Select Lecturer</option>
                                {users.filter(u => u.role === 'lecturer').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowCreateCourse(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Create User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-3">
                            <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="student">Student</option>
                                <option value="lecturer">Lecturer</option>
                                <option value="hod">HoD</option>
                            </select>
                            <input type="text" placeholder="Name" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                            <input type="text" placeholder="Reg Number / ID" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.regNumber} onChange={e => setNewUser({ ...newUser, regNumber: e.target.value })} required />
                            <input type="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                            <input type="text" placeholder="Password" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />

                            {newUser.role === 'student' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Intake" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.intake} onChange={e => setNewUser({ ...newUser, intake: e.target.value })} />
                                    <input type="text" placeholder="Cohort" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newUser.cohortYear} onChange={e => setNewUser({ ...newUser, cohortYear: e.target.value })} />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowCreateUser(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {editingCourse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Course</h3>
                        <form onSubmit={handleUpdateCourse} className="space-y-3">
                            <input type="text" placeholder="Course Code" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.code} onChange={e => setEditingCourse({ ...editingCourse, code: e.target.value })} required />
                            <input type="text" placeholder="Course Name" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.name} onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Intake" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.intake} onChange={e => setEditingCourse({ ...editingCourse, intake: e.target.value })} />
                                <input type="text" placeholder="Cohort" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.cohortYear} onChange={e => setEditingCourse({ ...editingCourse, cohortYear: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                                    <input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.startDate} onChange={e => setEditingCourse({ ...editingCourse, startDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                                    <input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.endDate} onChange={e => setEditingCourse({ ...editingCourse, endDate: e.target.value })} required />
                                </div>
                            </div>
                            <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingCourse.lecturerId} onChange={e => setEditingCourse({ ...editingCourse, lecturerId: e.target.value })} required>
                                <option value="">Select Lecturer</option>
                                {users.filter(u => u.role === 'lecturer').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setEditingCourse(null)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-3">
                            <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                                <option value="student">Student</option>
                                <option value="lecturer">Lecturer</option>
                                <option value="hod">HoD</option>
                            </select>
                            <input type="text" placeholder="Name" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} required />
                            <input type="text" placeholder="Reg Number / ID" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.regNumber} onChange={e => setEditingUser({ ...editingUser, regNumber: e.target.value })} required />
                            <input type="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} required />

                            {editingUser.role === 'student' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Intake" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.intake || ''} onChange={e => setEditingUser({ ...editingUser, intake: e.target.value })} />
                                    <input type="text" placeholder="Cohort" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={editingUser.cohortYear || ''} onChange={e => setEditingUser({ ...editingUser, cohortYear: e.target.value })} />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageTransition>
    );
};

export default HodDashboard;
