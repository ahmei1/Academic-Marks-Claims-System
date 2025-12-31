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
    const [joinedCourses, setJoinedCourses] = useState([]);
    const [showClaimForm, setShowClaimForm] = useState(false);
    const [selectedMark, setSelectedMark] = useState(null);
    const [claimReason, setClaimReason] = useState('cat');
    const [claimExplanation, setClaimExplanation] = useState('');
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

            // Transform marks to include course info
            const marksWithCourse = studentMarks.map(m => ({
                ...m,
                // Use utility for safe calculation (and backend value as fallback if exists)
                total: m.total || calculateTotalMark(m.cat, m.fat, m.individualAssignment, m.groupAssignment, m.quiz, m.attendance),
                course: allCourses.find(c => c.id === m.courseId)
            }));

            setMarks(marksWithCourse);

            // Identify Joined Courses
            const myJoinedCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
            setJoinedCourses(myJoinedCourses);

            // Filter courses based on student's academic year, intake, and cohort
            // Show course if criteria matches or if course has no criteria set
            const filteredCourses = allCourses.filter(c => {
                // If already joined, don't show in "Available"
                if (enrolledCourseIds.includes(c.id)) return false;

                // Strict filtering as requested by USER:
                // Student MUST match the Course's Intake and Cohort Year.

                // 1. Year Match (Loose "Year 1" vs "1" handling, but strict requirement)
                const courseYear = (c.targetYear || '').replace(/Year\s*/i, '').trim();
                const studentYear = (user.academicYear || '').replace(/Year\s*/i, '').trim();
                const yearMatch = !c.targetYear || (courseYear === studentYear);

                // 2. Intake Match (Strict)
                const courseIntake = String(c.intake || '').trim();
                const studentIntake = String(user.intake || '').trim();
                // If course has intake, student MUST match. If course has no intake, allow all? 
                // Assumed: If course implies specific intake, filter. 
                const intakeMatch = !courseIntake || (courseIntake === studentIntake);

                // 3. Cohort Match (Strict)
                const courseCohort = String(c.cohortYear || '').trim();
                const studentCohort = String(user.cohortYear || '').trim();
                const cohortMatch = !courseCohort || (courseCohort === studentCohort);

                return yearMatch && intakeMatch && cohortMatch;
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
        if (!confirm("Join this course?")) return;
        try {
            await ApiService.joinCourse({ studentId: user.id, courseId });
            alert("Joined successfully!");
            loadData();
        } catch (err) {
            alert("Failed to join");
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

                {/* Joined Courses Section */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        <CheckCircle size={20} className="text-green-500" /> Joined Courses
                    </h3>
                    <div className="flex flex-col gap-3">
                        {joinedCourses.length === 0 && <p className="text-slate-500 italic">You haven't joined any courses yet.</p>}
                        {joinedCourses.map(course => (
                            <div key={course.id} className="p-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{course.code}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">{course.name}</div>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">Enrolled</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Available Courses Section */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        Available Courses ({courses.length})
                    </h3>
                    <div className="flex flex-col gap-3">
                        {courses.length === 0 && <p className="text-slate-500 italic">No courses available.</p>}
                        {courses.map(course => {
                            const hasMark = marks.some(m => m.courseId === course.id);
                            // DEBUG: Commenting out this check to see if it's hiding valid courses
                            // if (hasMark) return null; 

                            return (
                                <div key={course.id} className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{course.code}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{course.name}</div>
                                    </div>
                                    <button
                                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
                                        onClick={() => handleJoinCourse(course.id)}
                                    >
                                        Join
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

                {/* Claims History Section */}
                <section className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                        Recent Claims
                    </h3>
                    <div className="flex flex-col gap-4">
                        {claims.length === 0 && <p className="text-slate-500 italic">No claims submitted yet.</p>}
                        {claims.map(claim => {
                            const course = courses.find(c => c.id === claim.courseId);
                            return (
                                <div key={claim.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-semibold text-slate-900 dark:text-white">{course?.code} - {claim.assessmentType.toUpperCase()}</span>
                                        <span className={`flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full 
                                            ${claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                claim.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {getStatusIcon(claim.status)} {claim.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 italic">
                                        "{claim.explanation}"
                                    </p>
                                    {claim.lecturerComment && (
                                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg text-sm border-l-4 border-green-500 mb-2">
                                            <strong className="block text-green-700 dark:text-green-400 mb-1">Lecturer's Response:</strong>
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
            {/* DEBUG PANEL */}
            <div className="mt-12 p-6 bg-slate-900 rounded-xl border border-slate-700 font-mono text-sm text-slate-300 overflow-x-auto">
                <h3 className="text-red-400 font-bold mb-4 border-b border-slate-700 pb-2">🚧 Strict Filtering Debugger</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-white font-bold mb-2">Based on Your Profile:</h4>
                        <div className="space-y-1">
                            <p><span className="text-slate-500">Academic Year:</span> <span className="text-yellow-400">"{user.academicYear}"</span></p>
                            <p><span className="text-slate-500">Intake:</span> <span className="text-yellow-400">"{user.intake}"</span></p>
                            <p><span className="text-slate-500">Cohort Year:</span> <span className="text-yellow-400">"{user.cohortYear}"</span></p>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-2">Available Courses Check:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {rawCourses.map(c => {
                                const courseYear = (c.targetYear || '').replace(/Year\s*/i, '').trim();
                                const studentYear = (user.academicYear || '').replace(/Year\s*/i, '').trim();
                                const yearMatch = !c.targetYear || (courseYear === studentYear);

                                const courseIntake = String(c.intake || '').trim();
                                const studentIntake = String(user.intake || '').trim();
                                const intakeMatch = !courseIntake || (courseIntake === studentIntake);

                                const courseCohort = String(c.cohortYear || '').trim();
                                const studentCohort = String(user.cohortYear || '').trim();
                                const cohortMatch = !courseCohort || (courseCohort === studentCohort);

                                const isMatch = yearMatch && intakeMatch && cohortMatch;

                                if (joinedCourses.find(j => j.id === c.id)) return null; // Skip joined

                                return (
                                    <div key={c.id} className={`p-2 rounded border ${isMatch ? 'border-green-500/50 bg-green-900/10' : 'border-red-500/50 bg-red-900/10'}`}>
                                        <div className="font-bold">{c.code}</div>
                                        <div className="text-xs grid grid-cols-3 gap-2 mt-1">
                                            <span className={yearMatch ? 'text-green-400' : 'text-red-400'}>Yr: "{courseYear}" vs "{studentYear}"</span>
                                            <span className={intakeMatch ? 'text-green-400' : 'text-red-400'}>In: "{courseIntake}" vs "{studentIntake}"</span>
                                            <span className={cohortMatch ? 'text-green-400' : 'text-red-400'}>Co: "{courseCohort}" vs "{studentCohort}"</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">*Strict Mode: All 3 fields must match exactly (or be empty on the course).</p>
            </div>

        </PageTransition>
    );
};

export default StudentDashboard;
