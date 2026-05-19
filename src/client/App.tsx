import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { MessagesWidget } from './components/MessagesWidget';

// Lazy loading pages for performance optimization
const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const StudentDashboard = React.lazy(() => import('./pages/student/StudentDashboard'));
const ApplicationForm = React.lazy(() => import('./pages/student/ApplicationForm'));
const StudentServices = React.lazy(() => import('./pages/student/StudentServices'));
const StudentFinancials = React.lazy(() => import('./pages/student/StudentFinancials'));
const DormitoryManager = React.lazy(() => import('./pages/admin/DormitoryManager'));
const ApplicationsReview = React.lazy(() => import('./pages/admin/ApplicationsReview'));
const AllocationDashboard = React.lazy(() => import('./pages/admin/AllocationDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const DirectorDashboard = React.lazy(() => import('./pages/admin/DirectorDashboard'));
const AnalyticsDashboard = React.lazy(() => import('./pages/admin/AnalyticsDashboard'));

const Unauthorized = () => (
  <div className="flex items-center justify-center min-h-screen">
    <h1 className="text-2xl font-bold text-red-600">Доступ заборонено (403)</h1>
  </div>
);

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Simple layout with navigation wrapper
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ADMIN_CAMPUS' || user?.role === 'ADMIN_COMMANDANT';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">Dormitory SaaS</span>
              <div className="hidden md:flex ml-10 space-x-4">
                {isAdmin && (
                  <>
                    <Link to="/admin/analytics" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Аналітика</Link>
                    <Link to="/admin/students" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Студенти</Link>
                    <Link to="/admin/dormitories" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Фонд</Link>
                    <Link to="/admin/applications" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Заяви</Link>
                    <Link to="/admin/allocation" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Розподіл</Link>
                    <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Адміни</Link>
                  </>
                )}
                {user?.role === 'STUDENT' && (
                  <>
                    <Link to="/student/dashboard" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Кабінет</Link>
                    <Link to="/student/application" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Подати заяву</Link>
                    <Link to="/student/services" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Сервіси</Link>
                    <Link to="/student/financials" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Фінанси</Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-gray-500">{user.firstName} {user.lastName}</span>
                  <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">Вийти</button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="py-6">
        {children}
      </main>
      <MessagesWidget />
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
              <Route path="/student/*" element={<Layout><Routes>
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="application" element={<ApplicationForm />} />
                <Route path="services" element={<StudentServices />} />
                <Route path="financials" element={<StudentFinancials />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes></Layout>} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT']} />}>
              <Route path="/admin/*" element={<Layout><Routes>
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="students" element={<DirectorDashboard />} />
                <Route path="dormitories" element={<DormitoryManager />} />
                <Route path="applications" element={<ApplicationsReview />} />
                <Route path="allocation" element={<AllocationDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="*" element={<Navigate to="analytics" replace />} />
              </Routes></Layout>} />
            </Route>

            {/* Default Route Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
};

export default App;
