import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, AlertTriangle, User, FileText, Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { calculateTotalMark } from '../../utils/calculations';
import MarkDistributionChart from '../../components/charts/MarkDistributionChart';
import ClaimStatusChart from '../../components/charts/ClaimStatusChart';
import PageTransition from '../../components/PageTransition';

const LecturerDashboard = () => {
    const { user } = useAuth();
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [enrollments, setEnrollments] = useState([]); // New state
    const [loading, setLoading] = useState(true);

    // Review Form State
    const [decision, setDecision] = useState('approve');
    const [lecturerComment, setLecturerComment] = useState('');
    const [newScore, setNewScore] = useState(0);

    // Course Creation State
    const [showCreateCourse, setShowCreateCourse] = useState(false);
    const [newCourseCode, setNewCourseCode] = useState('');
    const [newCourseName, setNewCourseName] = useState('');
    const [targetYear, setTargetYear] = useState('Year 1');
    const [intake, setIntake] = useState('');
    const [cohortYear, setCohortYear] = useState('');

    // Grading State
    const [selectedCourseForGrading, setSelectedCourseForGrading] = useState(null);
    const [gradingStudents, setGradingStudents] = useState([]);
    const [gradingSearchTerm, setGradingSearchTerm] = useState(''); // New search state

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    // ... (existing loadData) ...

    const handleOpenGrading = (course) => {
        setGradingSearchTerm(''); // Reset search
        // Find students enrolled in this course
        const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
        const enrolledStudentIds = courseEnrollments.map(e => e.studentId);

        // Prepare rows: Student Info + Existing Marks (if any)
        const rows = enrolledStudentIds.map(stId => {
            const student = students.find(s => s.id === stId);
            const existingMark = allMarks.find(m => m.courseId === course.id && m.studentId === stId);
            return {
                studentId: stId,
                name: student?.name || 'Unknown',
                regNumber: student?.regNumber || 'N/A',
                intake: student?.intake || 'N/A',
                cohortYear: student?.cohortYear || 'N/A',
                cat: existingMark?.cat || 0,
                fat: existingMark?.fat || 0,
                individualAssignment: existingMark?.individualAssignment || 0,
                groupAssignment: existingMark?.groupAssignment || 0,
                quiz: existingMark?.quiz || 0,
                attendance: existingMark?.attendance || 0,
                attendance: existingMark?.attendance || 0,
                markId: existingMark?.id || null,
                isPublished: existingMark?.isPublished || false
            };
        });

        setGradingStudents(rows);
        setSelectedCourseForGrading(course);
    };

    const handleGradeChange = (studentId, field, value) => {
        setGradingStudents(prev => prev.map(row =>
            row.studentId === studentId ? { ...row, [field]: parseFloat(value) || 0 } : row
        ));
    };

    const handleSaveGrades = async (publish = false) => {
        // ... (existing save logic)
        // Ideally bulk API, but loop is fine for demo
        for (const row of gradingStudents) {
            const markData = {
                studentId: row.studentId,
                courseId: selectedCourseForGrading.id,
                cat: row.cat,
                fat: row.fat,
                individualAssignment: row.individualAssignment,
                groupAssignment: row.groupAssignment,
                quiz: row.quiz,
                attendance: row.attendance,
                total: calculateTotalMark(row.cat, row.fat, row.individualAssignment, row.groupAssignment, row.quiz, row.attendance),
                isPublished: publish
            };

            if (row.markId) {
                await ApiService.updateMark(row.markId, markData);
            } else {
                await ApiService.createMark(markData);
            }
        }
        alert(publish ? "Grades Published Successfully!" : "Grades Saved as Draft!");
        setSelectedCourseForGrading(null);
        loadData();
    };

    // Filter students based on search term
    const filteredGradingStudents = gradingStudents.filter(student =>
        student.regNumber.toLowerCase().includes(gradingSearchTerm.toLowerCase())
    );

    // ... (existing loadData and other handlers) ...

    const loadData = async () => {
        setLoading(true);
        try {
            const lecturerClaims = await ApiService.getClaims({ lecturerId: user.id });
            const allStudents = await ApiService.getUsers().then(users => users.filter(u => u.role === 'student'));
            const allCourses = await ApiService.getCourses();
            // Filter courses created by this lecturer
            const myCourses = allCourses.filter(c => c.lecturerId === user.id);
            const marks = await ApiService.getMarks(null, { includeDrafts: true });
            const allEnrollments = await ApiService.getEnrollments();

            setClaims(lecturerClaims);
            setStudents(allStudents);
            setCourses(myCourses); // Only show my courses
            setAllMarks(marks);
            setEnrollments(allEnrollments);
        } catch (error) {
            console.error("Error loading lecturer data", error);
        } finally {
            setLoading(false);
        }
    };

    // ... (existing code)

    // ... (existing code)

    // ... (existing code)

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await ApiService.createCourse({
                code: newCourseCode,
                name: newCourseName,
                targetYear: targetYear,
                intake: intake,
                cohortYear: cohortYear,
                lecturerId: user.id
            });
            setShowCreateCourse(false);
            setNewCourseCode('');
            setNewCourseName('');
            setTargetYear('Year 1');
            setIntake('');
            setCohortYear('');
            alert('Course created successfully!');
            loadData();
        } catch (err) {
            alert('Failed to create course');
        }
    };

    const [editingCourse, setEditingCourse] = useState(null);

    const handleDeleteCourse = async (courseId) => {
        if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
        try {
            await ApiService.deleteCourse(courseId);
            alert('Course deleted.');
            loadData();
        } catch (err) {
            alert('Failed to delete course');
        }
    };

    const handleToggleClaims = async (course) => {
        try {
            const newStatus = !course.claimsEnabled;
            await ApiService.updateCourse(course.id, { claimsEnabled: newStatus });
            // Optimistic update or reload
            setCourses(prev => prev.map(c => c.id === course.id ? { ...c, claimsEnabled: newStatus } : c));
        } catch (err) {
            alert('Failed to toggle claims status');
        }
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        try {
            await ApiService.updateCourse(editingCourse.id, {
                code: editingCourse.code,
                name: editingCourse.name,
                targetYear: editingCourse.targetYear,
                intake: editingCourse.intake,
                cohortYear: editingCourse.cohortYear
            });
            setEditingCourse(null);
            alert('Course updated successfully!');
            loadData();
        } catch (err) {
            alert('Failed to update course');
        }
    };

    const handleOpenReview = (claim) => {
        setSelectedClaim(claim);
        setDecision('approve');
        setLecturerComment('');
        setNewScore(claim.originalMark);
    };

    const handleSubmitDecision = async (e) => {
        e.preventDefault();
        if (!selectedClaim) return;

        if (decision === 'approve') {
            const markUpdate = {};
            markUpdate[selectedClaim.assessmentType] = parseFloat(newScore);

            await ApiService.updateMark(selectedClaim.markId, markUpdate);

            await ApiService.updateClaim(selectedClaim.id, {
                status: 'approved',
                lecturerComment: lecturerComment || 'Mark updated.',
                resolvedAt: new Date().toISOString()
            });
        } else {
            await ApiService.updateClaim(selectedClaim.id, {
                status: 'rejected',
                lecturerComment: lecturerComment || 'No errors found in marking.',
                resolvedAt: new Date().toISOString()
            });
        }

        alert('Claim resolved successfully.');
        setSelectedClaim(null);
        loadData();
    };

    const generateReport = (claim, student, course) => {
        const reportContent = `
ACADEMIC CORRECTION REPORT
--------------------------
Date: ${new Date().toLocaleDateString()}
Claim ID: ${claim.id}
Student: ${student?.name} (${student?.email})
Course: ${course?.code} - ${course?.name}
Assessment: ${claim.assessmentType}

Original Mark: ${claim.originalMark}
Decision: ${claim.status.toUpperCase()}
Lecturer Comments: ${claim.lecturerComment}

Resolved At: ${new Date(claim.resolvedAt).toLocaleString()}
--------------------------
Generated by UNILAK Digital Academic Marks Review System
`;
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CorrectionReport_${claim.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) return <div className="p-4">Loading Dashboard...</div>;

    return (
        <PageTransition>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lecturer Dashboard</h2>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                    onClick={() => setShowCreateCourse(true)}
                >
                    <FileText size={18} />
                    <span>Create New Course</span>
                </button>
            </div>

            {/* My Courses Section */}
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">My Courses</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => {
                        const enrolledCount = enrollments.filter(e => e.courseId === course.id).length;
                        return (
                            <div key={course.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-md">
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{course.code}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{course.name}</p>

                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center mb-4">
                                    <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 font-semibold mb-2">
                                        <User size={16} className="text-blue-500" />
                                        <span>{enrolledCount} Students Enrolled</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleClaims(course)}
                                        className={`flex items-center justify-center gap-2 text-sm px-3 py-1 rounded-full transition-colors w-full ${course.claimsEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'}`}
                                    >
                                        {course.claimsEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                        {course.claimsEnabled ? 'Claims OPEN' : 'Claims CLOSED'}
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                                        onClick={() => handleOpenGrading(course)}
                                    >
                                        Manage & Grade
                                    </button>
                                    <button
                                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                        onClick={() => setEditingCourse(course)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        onClick={() => handleDeleteCourse(course.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <MarkDistributionChart marks={allMarks} />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-center font-bold text-slate-600 dark:text-slate-300 mb-4">Claim Statistics</h3>
                    <ClaimStatusChart claims={claims} />
                </div>
            </div>

            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Review Pending Claims</h3>

            <div className="flex flex-col gap-4">
                {claims.length === 0 && <p className="text-slate-500 italic">No pending claims.</p>}
                {claims.map(claim => {
                    const student = students.find(s => s.id === claim.studentId);
                    const course = courses.find(c => c.id === claim.courseId);
                    const isPending = claim.status === 'pending';

                    return (
                        <div key={claim.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 ${!isPending ? 'opacity-85' : ''}`}>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{course?.code} - {claim.assessmentType.toUpperCase()}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                        ${claim.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {claim.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    <span className="flex items-center gap-1"><User size={14} /> {student?.name} ({student?.regNumber})</span>
                                    <span className="flex items-center gap-1"><FileText size={14} /> Original Score: {claim.originalMark}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-slate-700 dark:text-slate-300 text-sm mb-4">
                                    "{claim.explanation}"
                                </div>

                                {!isPending && (
                                    <div className="text-sm border-t border-slate-100 dark:border-slate-700 pt-3 mt-2">
                                        <strong className="text-slate-900 dark:text-slate-200">Decision Note:</strong> <span className="text-slate-600 dark:text-slate-400">{claim.lecturerComment}</span>
                                        <div className="mt-3">
                                            <button
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
                                                onClick={() => generateReport(claim, student, course)}
                                            >
                                                <Download size={14} /> Download Official Report
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isPending && (
                                <div className="flex items-center">
                                    <button
                                        className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                                        onClick={() => handleOpenReview(claim)}
                                    >
                                        Review
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Create Course Modal */}
            {showCreateCourse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Create New Course</h3>
                        <form onSubmit={handleCreateCourse}>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Course Code</label>
                                <input
                                    type="text" required placeholder="e.g. CS101"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Course Name</label>
                                <input
                                    type="text" required placeholder="e.g. Intro to CS"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Target Year</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(e.target.value)}
                                >
                                    <option value="Year 1">Year 1</option>
                                    <option value="Year 2">Year 2</option>
                                    <option value="Year 3">Year 3</option>
                                    <option value="Year 4">Year 4</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Intake</label>
                                    <input
                                        type="text" placeholder="e.g. 9"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={intake} onChange={(e) => setIntake(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Cohort Year</label>
                                    <input
                                        type="text" placeholder="e.g. 2024"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={cohortYear} onChange={(e) => setCohortYear(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {selectedCourseForGrading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Grading: {selectedCourseForGrading.code}</h3>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
                                    <span className="bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                        Target: Intake {selectedCourseForGrading.intake || 'N/A'} - {selectedCourseForGrading.cohortYear || 'N/A'}
                                    </span>
                                    <span>{filteredGradingStudents.length} Students found</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search by Reg Number..."
                                    value={gradingSearchTerm}
                                    onChange={(e) => setGradingSearchTerm(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                                />
                                <button className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => setSelectedCourseForGrading(null)}>
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 min-h-[400px]">
                            {filteredGradingStudents.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {gradingStudents.length === 0 ? "No students enrolled yet." : "No matching students found."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-8">
                                    {/* Group students by Intake + Cohort */}
                                    {Object.entries(filteredGradingStudents.reduce((groups, student) => {
                                        const key = `Intake ${student.intake} - ${student.cohortYear}`;
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(student);
                                        return groups;
                                    }, {})).map(([groupKey, groupStudents]) => (
                                        <div key={groupKey} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
                                                    {groupKey}
                                                </h4>
                                                <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-600 rounded-md border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-300">
                                                    {groupStudents.length} Students
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/20">
                                                        <tr>
                                                            <th className="px-4 py-3">Student</th>
                                                            <th className="px-2 py-3 w-20 text-center">Ind. Assgn</th>
                                                            <th className="px-2 py-3 w-20 text-center">Grp Assgn</th>
                                                            <th className="px-2 py-3 w-20 text-center">Quiz</th>
                                                            <th className="px-2 py-3 w-20 text-center">CAT</th>
                                                            <th className="px-2 py-3 w-20 text-center">FAT</th>
                                                            <th className="px-2 py-3 w-20 text-center">Attd</th>
                                                            <th className="px-4 py-3 w-20 text-center">Total</th>
                                                            <th className="px-2 py-3 w-20 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {groupStudents.map(student => (
                                                            <tr key={student.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                                    <div>{student.name}</div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">{student.regNumber}</div>
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.individualAssignment} onChange={(e) => handleGradeChange(student.studentId, 'individualAssignment', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.groupAssignment} onChange={(e) => handleGradeChange(student.studentId, 'groupAssignment', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.quiz} onChange={(e) => handleGradeChange(student.studentId, 'quiz', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.cat} onChange={(e) => handleGradeChange(student.studentId, 'cat', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.fat} onChange={(e) => handleGradeChange(student.studentId, 'fat', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-3">
                                                                    <input type="number" className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={student.attendance} onChange={(e) => handleGradeChange(student.studentId, 'attendance', e.target.value)} />
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-center">
                                                                    {calculateTotalMark(student.cat, student.fat, student.individualAssignment, student.groupAssignment, student.quiz, student.attendance)}
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${student.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                                        {student.isPublished ? 'Pub' : 'Dft'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                            <button onClick={() => setSelectedCourseForGrading(null)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <div className="flex gap-2">
                                <button onClick={() => handleSaveGrades(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-medium rounded-lg transition-colors">Save Draft</button>
                                <button onClick={() => handleSaveGrades(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">Publish Marks</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {selectedClaim && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Review Claim</h3>

                        <form onSubmit={handleSubmitDecision}>
                            <div className="mb-4">
                                <label className="block mb-2 font-semibold text-slate-700 dark:text-slate-300">Action</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="decision" value="approve" checked={decision === 'approve'} onChange={(e) => setDecision(e.target.value)} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-slate-700 dark:text-slate-300">Update Mark</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="decision" value="reject" checked={decision === 'reject'} onChange={(e) => setDecision(e.target.value)} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-slate-700 dark:text-slate-300">Reject Claim</span>
                                    </label>
                                </div>
                            </div>

                            {decision === 'approve' && (
                                <div className="mb-4">
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Corrected Score ({selectedClaim.assessmentType.toUpperCase()})</label>
                                    <input
                                        type="number"
                                        value={newScore}
                                        onChange={(e) => setNewScore(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Comments / Reason</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={lecturerComment}
                                    onChange={(e) => setLecturerComment(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Explanation for the student..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => setSelectedClaim(null)}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Submit Decision</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Course Modal */}
            {editingCourse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Edit Course</h3>
                        <form onSubmit={handleUpdateCourse}>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Course Code</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingCourse.code}
                                    onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Course Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingCourse.name}
                                    onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Target Year</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingCourse.targetYear || 'Year 1'}
                                    onChange={(e) => setEditingCourse({ ...editingCourse, targetYear: e.target.value })}
                                >
                                    <option value="Year 1">Year 1</option>
                                    <option value="Year 2">Year 2</option>
                                    <option value="Year 3">Year 3</option>
                                    <option value="Year 4">Year 4</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Intake</label>
                                    <input
                                        type="text" placeholder="e.g. 9"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingCourse.intake || ''}
                                        onChange={(e) => setEditingCourse({ ...editingCourse, intake: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Cohort Year</label>
                                    <input
                                        type="text" placeholder="e.g. 2024"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingCourse.cohortYear || ''}
                                        onChange={(e) => setEditingCourse({ ...editingCourse, cohortYear: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => setEditingCourse(null)}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageTransition>
    );
};

export default LecturerDashboard;
