import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import LiveBackground from '../../components/LiveBackground';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [regNumber, setRegNumber] = useState('');
    const [password, setPassword] = useState('');

    // Sign Up States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('student');
    const [academicYear, setAcademicYear] = useState('');
    const [program, setProgram] = useState('');
    const [intake, setIntake] = useState('');
    const [cohortYear, setCohortYear] = useState('');
    const [accessCode, setAccessCode] = useState(''); // New state for Lecturer Access Code

    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (await login(regNumber, password)) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user?.role === 'student') navigate('/student');
            else if (user?.role === 'lecturer') navigate('/lecturer');
        } else {
            setError('Invalid Registration Number or Password');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Lecturer Access Code Validation
        if (role === 'lecturer' && accessCode !== 'ADMIN_1234') {
            setError('Invalid Lecturer Access Code. Contact Administrator.');
            return;
        }

        try {
            // Dynamically import ApiService here or move import to top if module system allows safe circular deps (it should be fine)
            const { ApiService } = await import('../../services/api');

            const userData = {
                regNumber,
                password,
                name,
                email,
                role,
                ...(role === 'student' ? { academicYear, program, intake, cohortYear } : {})
            };

            await ApiService.register(userData);

            // Auto login logic is handled inside register (localStorage set), but we need to update context if possible. 
            // Better to just call login() to refresh context state properly.
            if (await login(regNumber, password)) {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user?.role === 'student') navigate('/student');
                else if (user?.role === 'lecturer') navigate('/lecturer');
            }

        } catch (err) {
            console.error(err);
            setError(err.message || 'Registration failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen transition-colors duration-200 relative overflow-hidden">
            <LiveBackground />
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mx-4">
                <div className="text-center mb-8 items-center flex flex-col gap-4">
                    <img src="src/assets/OIP (1).webp" alt="" width={200} className='rounded-xl border hover:border-blue-500 transition-all duration-300' />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">UNILAK Academic Marks System</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to your account</p>
                </div>

                {error && (
                    <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center justify-center">
                        {error}
                    </div>
                )}

                <div className="flex justify-between mb-6">
                    <button
                        
                        className={`text-lg font-bold pb-2 px-4 transition-colors ${!isSignUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                        onClick={() => setIsSignUp(false)}
                    >
                        Sign In
                    </button>
                    <button
                        className={`text-lg font-bold pb-2 px-4 transition-colors ${isSignUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                        onClick={() => setIsSignUp(true)}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={isSignUp ? handleRegister : handleLogin} className="space-y-4">
                    {isSignUp && (
                        <>
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300 ">Full Name</label>
                                <input
                                    type="text" required
                                    value={name} onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Registration Number / Staff ID</label>
                        <input
                            type="text" required
                            placeholder='e.g 12345/2024'
                            value={regNumber} onChange={(e) => setRegNumber(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none  hover:border-blue-500 transition-all duration-300"
                        />
                    </div>

                    {isSignUp && (
                        <div>
                            <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Role</label>
                            <div className="flex gap-4 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer dark:text-white">
                                    <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="text-blue-600 focus:ring-blue-500" />
                                    Student
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer dark:text-white">
                                    <input type="radio" name="role" value="lecturer" checked={role === 'lecturer'} onChange={() => setRole('lecturer')} className="text-blue-600 focus:ring-blue-500" />
                                    Lecturer
                                </label>
                            </div>
                        </div>      
                    )}

                    {isSignUp && role === 'lecturer' && (
                        <div>
                            <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Access Code <span className="text-red-500">*</span></label>
                            <input
                                type="password" required
                                placeholder="Enter Admin Code to register as Lecturer"
                                value={accessCode} onChange={(e) => setAccessCode(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}

                    {isSignUp && role === 'student' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Year</label>
                                <input
                                    type="text" placeholder="e.g. Year 1"
                                    value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Program</label>
                                <input
                                    type="text" placeholder="e.g. CS"
                                    value={program} onChange={(e) => setProgram(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Intake</label>
                                <input
                                    type="text" placeholder="e.g. 9"
                                    value={intake} onChange={(e) => setIntake(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Cohort Year</label>
                                <input
                                    type="text" placeholder="e.g. 2024"
                                    value={cohortYear} onChange={(e) => setCohortYear(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                        <input
                            type="password" required
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600  dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Demo Credentials</p>
                    <div className="flex justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded">Student: <strong>STU001</strong></div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded">Lecturer: <strong>LEC001</strong></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Password: <strong>password</strong></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
