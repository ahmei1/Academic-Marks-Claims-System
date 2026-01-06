import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, PlusCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { calculateTotalMark } from '../../utils/calculations';
import PageTransition from '../../components/PageTransition';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [marks, setMarks] = useState([]);
    const [claims, setClaims] = useState([]);
    const [courses, setCourses] = useState([]);
    // const [joinedCourses, setJoinedCourses] = useState([]); // Removed, replaced by split state
    const [activeCourses, setActiveCourses] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [allCoursesList, setAllCoursesList] = useState([]); // Store ALL courses for reference (lookups)

    const [showClaimForm, setShowClaimForm] = useState(false);
    const [selectedMark, setSelectedMark] = useState(null);
    const [claimReason, setClaimReason] = useState('cat');
    const [claimExplanation, setClaimExplanation] = useState('');
    const [activeClaimTab, setActiveClaimTab] = useState('active'); // 'active' | 'history'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, showClaimForm]);

    const loadData = async () => {
        setLoading(true);
        try {
            const studentMarks = await ApiService.getMarks(user.id);
            const allCourses = await ApiService.getCourses();
            const studentClaims = await ApiService.getClaims({ studentId: user.id });
            const myEnrollments = await ApiService.getEnrollments({ studentId: user.id });
            const enrolledCourseIds = myEnrollments.map(e => e.courseId);
            const allUsers = await ApiService.getUsers();
            setLecturers(allUsers.filter(u => u.role === 'lecturer'));
            setAllCoursesList(allCourses);

            // Fetch Student's Module Sheet
            const myModules = await ApiService.getStudentModules(user.id);
            // Normalize codes to lowercase for safe matching
            const myModuleCodes = myModules.map(m => (m.moduleCode || '').trim().toLowerCase());

            console.log("My Module Sheet:", myModuleCodes); // Debug

            // Transform marks to include course info
            const marksWithCourse = studentMarks.map(m => ({
                ...m,
                // Use utility for safe calculation (and backend value as fallback if exists)
                total: m.total || calculateTotalMark(m.cat, m.fat, m.individualAssignment, m.groupAssignment, m.quiz, m.attendance),
                course: allCourses.find(c => c.id === m.courseId)
            }));

            // Deduplicate marks (Temporary fix for data duplication issue)
            const uniqueMarks = [];
            const seenCourseCodes = new Set();
            marksWithCourse.forEach(m => {
                const code = m.course?.code;
                if (!code || !seenCourseCodes.has(code)) {
                    if (code) seenCourseCodes.add(code);
                    uniqueMarks.push(m);
                }
            });

            setMarks(uniqueMarks);

            // Identify Joined Courses & Split
            const myJoinedCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));

            const now = new Date();
            const active = myJoinedCourses.filter(c => !c.endDate || new Date(c.endDate) > now);
            const completed = myJoinedCourses.filter(c => c.endDate && new Date(c.endDate) <= now);

            setActiveCourses(active);
            setCompletedCourses(completed);

            // Identify Failed Modules to allow Retakes (Marks < 50)
            const failedCourseCodes = marksWithCourse
                .filter(m => m.total < 50)
                .map(m => (m.course?.code || '').trim().toLowerCase())
                .filter(Boolean);

            console.log("Failed Module Codes:", failedCourseCodes); // Debug

            // Filter courses: "Available" means:
            // 1. Not already joined.
            // 2. FOUND in my Module Sheet (student_modules)
            //    OR Found in Failed List (Retake)
            const filteredCourses = allCourses.filter(c => {
                // If already joined, don't show in "Available"
                if (enrolledCourseIds.includes(c.id)) {
                    console.log(`[DEBUG] Course ${c.code} (${c.id}) SKIPPED: Already Joined`);
                    return false;
                }

                const courseCode = (c.code || '').trim().toLowerCase();

                // Check 1: Is in my explicit module sheet?
                const isInSheet = myModuleCodes.includes(courseCode);

                // Check 2: Is a Retake? (Failed previously)
                const isRetake = failedCourseCodes.includes(courseCode);

                // Fallback for transition: If no sheet exists for student yet, show nothing? 
                // Or keep old Year logic? 

                // Normalization Helper
                const normalizeIntake = (str) => {
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

                // Check 3: Intake & Cohort Match (Standard Class)
                const userIntake = normalizeIntake(user.intake);
                const courseIntake = normalizeIntake(c.intake);
                const isIntakeMatch = userIntake && courseIntake && userIntake === courseIntake;

                const userCohort = String(user.cohortYear || '').trim();
                const courseCohort = String(c.cohortYear || '').trim();
                const isCohortMatch = userCohort && courseCohort && userCohort === courseCohort;

                // Fallback for transition compatibility (if missing cohort/intake data)
                let yearMatchFallback = false;
                if (myModuleCodes.length === 0 && !isRetake && !isIntakeMatch) {
                    const normalizeYear = (str) => String(str || '').replace(/Year\s*/i, '').trim().toLowerCase();
                    const courseYear = normalizeYear(c.targetYear);
                    const studentYear = normalizeYear(user.academicYear);
                    yearMatchFallback = !c.targetYear || !user.academicYear || (courseYear === studentYear);
                }

                const isVisible = isInSheet || isRetake || (isIntakeMatch && isCohortMatch) || yearMatchFallback;

                console.log(`[DEBUG] Check ${c.code}: InSheet:${isInSheet} Retake:${isRetake} Intake:${isIntakeMatch}(${userIntake}/${courseIntake}) Cohort:${isCohortMatch} Fallback:${yearMatchFallback} => SHOW:${isVisible}`);

                return isVisible;
            });

            setCourses(filteredCourses);
            setClaims(studentClaims);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCourse = async (courseId) => {
        if (activeCourses.length > 0) {
            alert("You are already enrolled in an active course. You must complete it before joining another.");
            return;
        }
        if (!confirm("Join this course?")) return;
        try {
            await ApiService.joinCourse({ studentId: user.id, courseId });
            alert("Joined successfully!");
            loadData();
        } catch (err) {
            alert("Failed to join: " + err.message);
        }
    };

    const handleOpenClaim = (mark) => {
        setSelectedMark(mark);
        setShowClaimForm(true);
        setClaimReason('cat');
        setClaimExplanation('');
    };

    const handleSubmitClaim = async (e) => {
        e.preventDefault();
        if (!selectedMark) return;

        await ApiService.createClaim({
            studentId: user.id,
            courseId: selectedMark.courseId,
            assessmentType: claimReason,
            explanation: claimExplanation,
            originalMark: selectedMark[claimReason],
            markId: selectedMark.id
        });

        setShowClaimForm(false);
        alert('Claim submitted successfully!');
    };

    const getStatusColor = (status) => {
        if (status === 'approved') return 'var(--success)';
        if (status === 'rejected') return 'var(--danger)';
        return 'var(--warning)';
    };

    const getStatusIcon = (status) => {
        if (status === 'approved') return <CheckCircle size={16} />;
        if (status === 'rejected') return <AlertCircle size={16} />;
        return <Clock size={16} />;
    };

    if (loading) return <div className="p-4">Loading data...</div>;

    return (
        <PageTransition>
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Student Dashboard</h2>

            {/* Profile Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-6 items-center border border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                    <span className="text-3xl font-bold">{user.name.charAt(0)}</span>
                </div>
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-2">{user.regNumber}</p>
                    <div className="flex flex-wrap gap-4 text-sm justify-center md:justify-start">
                        <span className="bg-slate-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1 rounded-full">
                            <strong>Year:</strong> {user.academicYear || 'N/A'}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1 rounded-full">
                            <strong>Program:</strong> {user.program || 'N/A'}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1 rounded-full">
                            <strong>Dept:</strong> {user.department || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Available Courses Section - Render First implies priority, or we can stack active/completed on left? */}
                {/* The user wants to see "courses he has in the year". This usually means Available ones first? Or Active first? */}
                {/* Typically: Active > Available > Completed. Let's arrange nicely. */}
                {/* Let's put Active & Completed on Left (My Status) and Available on Right (Catalog)? OR Stack vertically. */}
                {/* The current grid is 2 columns. Let's put Active/Completed in col 1, Available in col 2. */}

                <div className="flex flex-col gap-6">
                    {/* Active Courses */}
                    <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                            <Clock size={20} className="text-blue-500" /> Current Courses
                        </h3>
                        <div className="flex flex-col gap-3">
                            {activeCourses.length === 0 && <p className="text-slate-500 italic text-sm">No active courses. Join one from the list!</p>}
                            {activeCourses.map(course => (
                                <div key={course.id} className="p-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center shadow-sm">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{course.code}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300">{course.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">Ends: {course.endDate ? new Date(course.endDate).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-blue-200 text-blue-800 rounded-full dark:bg-blue-800 dark:text-blue-200 animate-pulse">Active</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Completed Courses */}
                    <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit opacity-80 hover:opacity-100 transition-opacity">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                            <CheckCircle size={20} className="text-green-500" /> Completed Courses
                        </h3>
                        <div className="flex flex-col gap-3">
                            {completedCourses.length === 0 && <p className="text-slate-500 italic text-sm">No completed courses yet.</p>}
                            {completedCourses.map(course => (
                                <div key={course.id} className="p-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{course.code}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{course.name}</div>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">Done</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Available Courses Section */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        <PlusCircle size={20} className="text-purple-500" /> Available for Enrollment
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">Courses assigned to your Intake ({user.intake}) & Year ({user.academicYear})</p>

                    <div className="flex flex-col gap-3">
                        {courses.length === 0 && <p className="text-slate-500 italic text-sm">No new courses available for your intake.</p>}
                        {courses.map(course => {
                            return (
                                <div key={course.id} className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{course.code}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{course.name}</div>
                                        <div className="text-xs text-slate-400">Duration: {course.duration || 'N/A'}</div>
                                    </div>
                                    <button
                                        disabled={activeCourses.length > 0}
                                        title={activeCourses.length > 0 ? "Finish your current course first" : "Join this course"}
                                        className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors shadow-sm
                                            ${activeCourses.length > 0
                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 dark:border-slate-600'
                                                : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                                        onClick={() => handleJoinCourse(course.id)}
                                    >
                                        {activeCourses.length > 0 ? 'Locked' : 'Join Class'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Marks Section */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        <FileText size={20} className="text-blue-500" /> My Marks
                    </h3>
                    <div className="flex flex-col gap-4">
                        {marks.length === 0 && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                                No marks available yet. Join a course to get started.
                            </div>
                        )}
                        {marks.map((mark) => (
                            <div key={mark.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-transform hover:-translate-y-1 duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">{mark.course?.name}</h4>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">{mark.course?.code}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{mark.total}</span>
                                        <span className="text-xs text-slate-400 uppercase tracking-wide">Total Score</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ind. Asgn</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.individualAssignment || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Grp. Asgn</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.groupAssignment || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Quiz</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.quiz || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">CAT</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.cat || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">FAT</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.fat || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attd</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{mark.attendance || 0}</div>
                                    </div>
                                </div>

                                <button
                                    disabled={!mark.course?.claimsEnabled}
                                    className={`w-full flex items-center justify-center gap-2 py-2 border rounded-lg transition-colors text-sm font-medium
                                        ${mark.course?.claimsEnabled
                                            ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                            : 'text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'}`}
                                    title={!mark.course?.claimsEnabled ? "Lecturer has disabled claims for this course" : ""}
                                    onClick={() => mark.course?.claimsEnabled && handleOpenClaim(mark)}
                                >
                                    {mark.course?.claimsEnabled ? <PlusCircle size={16} /> : <Clock size={16} />}
                                    {mark.course?.claimsEnabled ? 'Request Review' : 'Claims Closed'}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Claims Section */}
                <section className="md:col-span-2 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                            My Claims
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveClaimTab('active')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeClaimTab === 'active'
                                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                Active ({claims.filter(c => c.status === 'pending').length})
                            </button>
                            <button
                                onClick={() => setActiveClaimTab('history')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeClaimTab === 'history'
                                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {claims.filter(c => activeClaimTab === 'active' ? c.status === 'pending' : c.status !== 'pending').length === 0 && (
                            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500 dark:text-slate-400 italic">
                                    {activeClaimTab === 'active' ? "No active claims pending review." : "No claim history found."}
                                </p>
                            </div>
                        )}

                        {claims
                            .filter(c => activeClaimTab === 'active' ? c.status === 'pending' : c.status !== 'pending')
                            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                            .map(claim => {
                                const course = allCoursesList.find(c => c.id === claim.courseId);
                                const lecturer = lecturers.find(l => l.id === course?.lecturerId);

                                return (
                                    <div key={claim.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{course?.name} ({course?.code})</h4>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    Lecturer: {lecturer?.name || 'Unknown'} | Assessment: {claim.assessmentType.toUpperCase()}
                                                </div>
                                            </div>
                                            <span className={`h-fit flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full 
                                            ${claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    claim.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {getStatusIcon(claim.status)} {claim.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 italic bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                            "{claim.explanation}"
                                        </p>
                                        {claim.lecturerComment && (
                                            <div className={`p-3 rounded-lg text-sm border-l-4 mb-2 ${claim.status === 'approved' ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500'}`}>
                                                <strong className={`block mb-1 ${claim.status === 'approved' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Lecturer's Response:</strong>
                                                <span className="text-slate-700 dark:text-slate-300">{claim.lecturerComment}</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-400 text-right mt-2">
                                            {new Date(claim.submittedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </section>
            </div>

            {/* Claim Modal */}
            {showClaimForm && selectedMark && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Submit Claim: {selectedMark.course?.code}</h3>
                            <form onSubmit={handleSubmitClaim}>
                                <div className="mb-4">
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Assessment Type</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        value={claimReason}
                                        onChange={(e) => setClaimReason(e.target.value)}
                                    >
                                        <option value="individualAssignment">Individual Assignment</option>
                                        <option value="groupAssignment">Group Assignment</option>
                                        <option value="quiz">Quiz</option>
                                        <option value="cat">CAT</option>
                                        <option value="fat">FAT</option>
                                        <option value="attendance">Attendance</option>
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Argument / Explanation</label>
                                    <textarea
                                        required
                                        rows={4}
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Please explain why you believe the mark is incorrect..."
                                        value={claimExplanation}
                                        onChange={(e) => setClaimExplanation(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => setShowClaimForm(false)}>Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Submit Claim</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


        </PageTransition>
    );
};

export default StudentDashboard;
