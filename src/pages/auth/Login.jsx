import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import LiveBackground from '../../components/LiveBackground';
import logo from '../../assets/unilak_logo.png';
const Login = () => {
    // const [isSignUp, setIsSignUp] = useState(false); // Signup disabled
    const [regNumber, setRegNumber] = useState('');
    const [password, setPassword] = useState('');
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
            else if (user?.role === 'hod') navigate('/hod');
            else navigate('/'); // Fallback
        } else {
            setError('Invalid Registration Number/ID or Password');
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
                    <img src={logo} alt="UNILAK Logo" width={200} height={200} className='rounded-xl ' />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">UNILAK Academic Marks System</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to your account</p>
                </div>

                {error && (
                    <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center justify-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Registration Number (Students) / Staff ID (Staff)
                        </label>
                        <input
                            type="text" required
                            placeholder='e.g. S12345 or L001'
                            value={regNumber} onChange={(e) => setRegNumber(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                        <input
                            type="password" required
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <button type="submit" className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        Sign In
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Demo Credentials</p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">Student: <strong>S12345</strong></div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">Lecturer: <strong>L001</strong></div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">HoD: <strong>HOD1</strong></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">Password for all: <strong>password</strong></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
