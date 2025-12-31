import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Layout from './layouts/Layout';
import StudentDashboard from './pages/student/Dashboard';
import LecturerDashboard from './pages/lecturer/Dashboard';

const RequireAuth = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'student' ? '/student' : '/lecturer'} replace />;
    }

    return children;
};

// Placeholder components to avoid build errors until files are actualy created
// I will create them in the very next step, but for build safety:
// Actually, I will create the files immediately in this turn or next. 
// To avoid "Module not found" errors, I should create the files in this same turn or use temporary placeholders in this file if I wasn't overwriting. 
// Since I'm overwriting, I must create StudentDashboard and LecturerDashboard files NOW or imports will fail.
// So I will make tool calls to create them in this same turn.

function App() {
    return (
        <Router basename={import.meta.env.BASE_URL}>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<Layout />}>
                    <Route
                        path="/student/*"
                        element={
                            <RequireAuth allowedRoles={['student']}>
                                <StudentDashboard />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/lecturer/*"
                        element={
                            <RequireAuth allowedRoles={['lecturer']}>
                                <LecturerDashboard />
                            </RequireAuth>
                        }
                    />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
