import { useEffect, type ReactNode, type JSX } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { loadMe, logoutUser } from './features/auth/authSlice';
import { authDB } from './database/authDB';
import { setTheme } from './features/theme/themeSlice';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThreeBg from './components/ThreeBg';
import { SupportWidget } from './components/SupportWidget';

// Pages
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import CoursePlayer from './pages/CoursePlayer';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import UserProfile from './pages/UserProfile';
import Checkout from './pages/Checkout';

// Protected Route Guard
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="w-10 h-10 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? (children as JSX.Element) : <Navigate to="/login" replace />;
};

// Admin Route Guard
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user, loading, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="w-10 h-10 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated && user?.role === 'ADMIN' ? (
    children as JSX.Element
  ) : (
    <Navigate to="/" replace />
  );
};

function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isInitialized } = useAppSelector((state) => state.auth);
  const themeMode = useAppSelector((state) => state.theme.mode);

  // Sync theme attribute whenever Redux state changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // Restore theme from localStorage on first mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) dispatch(setTheme(saved));
  }, [dispatch]);

  useEffect(() => {
    const initAuth = async () => {
      const token = await authDB.getToken('accessToken');
      if (token) {
        dispatch(loadMe());
      } else {
        // Just to set isInitialized to true if there's no token
        dispatch({ type: 'auth/loadMe/rejected', payload: 'No token found' });
      }
    };
    initAuth();

    // Handle session expiry event emitted by Axios interceptor
    const handleLogoutEvent = async () => {
      await dispatch(logoutUser());
      window.location.href = '/login';
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, [dispatch]);

  // ✅ Show spinner while initializing (max 6 seconds then renders anyway)
  if (!isInitialized) {
   
  }

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden relative selection:bg-theme-neonCyan/30 selection:text-white">
      <Toaster position="top-center" toastOptions={{ className: 'rtl' }} />
      {/* 3D Canvas Background */}
      <ThreeBg />

      {/* Navigation */}
      <Navbar />

      {/* Main Pages */}
      <main className="grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          
          <Route
            path="/checkout/:id"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Student Routes */}
          <Route
            path="/courses/:id/play"
            element={
              <ProtectedRoute>
                <CoursePlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />
      
      {/* Floating Support Widget - Hidden on admin page */}
      {!location.pathname.startsWith('/admin') && <SupportWidget />}
    </div>
  );
}

export default App;
