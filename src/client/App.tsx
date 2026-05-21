import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { MessagesWidget } from './components/MessagesWidget';
import { NotificationBell } from './components/NotificationBell';
import { useTheme } from './components/ThemeProvider';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  GitMerge,
  AlertTriangle,
  UsersRound,
  MessageSquare,
  CreditCard,
  Megaphone,
  Home,
  FileEdit,
  Wrench,
  Wallet,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield
} from 'lucide-react';

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
const AdminMessagesPage = React.lazy(() => import('./pages/admin/AdminMessagesPage'));
const AdminDebtsPage = React.lazy(() => import('./pages/admin/AdminDebtsPage'));
const AdminAnnouncementsPage = React.lazy(() => import('./pages/admin/AdminAnnouncementsPage'));
const AdminComplaintsPage = React.lazy(() => import('./pages/admin/AdminComplaintsPage'));
const AdminAuditLog = React.lazy(() => import('./pages/admin/AdminAuditLog'));
const MasterRepairsPage = React.lazy(() => import('./pages/master/MasterRepairsPage'));

const Unauthorized = () => (
  <div className="flex items-center justify-center min-h-screen ui-shell">
    <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">Доступ заборонено (403)</h1>
  </div>
);

const Loader = () => {
  const { theme } = useTheme();
  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  return (
    <div className="flex items-center justify-center min-h-screen ui-shell">
      <div className="w-full max-w-4xl px-4 space-y-4">
        <Skeleton height={28} width={220} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={16} width={320} baseColor={baseColor} highlightColor={highlightColor} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton height={160} baseColor={baseColor} highlightColor={highlightColor} />
          <Skeleton height={160} baseColor={baseColor} highlightColor={highlightColor} />
        </div>
        <Skeleton height={220} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    </div>
  );
};

// NavItem component
const NavItem = ({ to, icon: Icon, label, onClick, isActive }: { to: string, icon: any, label: string, onClick: () => void, isActive: boolean }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
        isActive
          ? 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))] shadow-sm'
          : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))]'}`} />
      {label}
    </Link>
  );
};

// Sidebar Layout
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Ви впевнені, що хочете вийти з системи?')) {
      logout();
      navigate('/login');
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ADMIN_CAMPUS' || user?.role === 'ADMIN_COMMANDANT';
  const isMaster = user?.role === 'MASTER_SLESAR' || user?.role === 'MASTER_SANTEKHNIK' || user?.role === 'MASTER_ELECTRIC';

  const getRoleLabel = (role: string | undefined) => {
    switch(role) {
      case 'ADMIN_CAMPUS': return 'Директор Студмістечка';
      case 'ADMIN_COMMANDANT': return 'Комендант';
      case 'ADMIN': return 'Адміністратор';
      case 'STUDENT': return 'Студент';
      case 'MASTER_SLESAR': return 'Слюсар';
      case 'MASTER_SANTEKHNIK': return 'Сантехнік';
      case 'MASTER_ELECTRIC': return 'Електрик';
      default: return role || 'Гість';
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen ui-shell overflow-hidden transition-colors duration-200">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[rgb(var(--accent))] via-[rgb(var(--accent))] to-transparent opacity-70" />
        <div className="h-16 flex items-center justify-between px-6 border-b border-[rgb(var(--border))]">
          <span className="text-xl font-semibold text-[rgb(var(--text))]">Dormitory SaaS</span>
          <button className="md:hidden text-[rgb(var(--muted))]" onClick={closeSidebar}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {isAdmin && (
            <>
              <NavItem to="/admin/analytics" icon={LayoutDashboard} label="Аналітика" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/analytics')} />
              <NavItem to="/admin/students" icon={Users} label="Студенти" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/students')} />
              <NavItem to="/admin/dormitories" icon={Building2} label="Гуртожитки" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/dormitories')} />
              <NavItem to="/admin/applications" icon={FileText} label="Заяви" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/applications')} />
              <NavItem to="/admin/allocation" icon={GitMerge} label="Поселення" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/allocation')} />
              <NavItem to="/admin/debts" icon={CreditCard} label="Боржники" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/debts')} />
              <NavItem to="/admin/complaints" icon={AlertTriangle} label="Скарги" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/complaints')} />
              <NavItem to="/admin/announcements" icon={Megaphone} label="Оголошення" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/announcements')} />
              <NavItem to="/admin/audit" icon={Shield} label="Аудит" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/audit')} />
              <NavItem to="/admin/users" icon={UsersRound} label="Користувачі" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/users')} />
              <NavItem to="/admin/messages" icon={MessageSquare} label="Чати" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/messages')} />
            </>
          )}
          {user?.role === 'STUDENT' && (
            <>
              <NavItem to="/student/dashboard" icon={Home} label="Головна" onClick={closeSidebar} isActive={location.pathname.startsWith('/student/dashboard')} />
              <NavItem to="/student/application" icon={FileEdit} label="Подання заяви" onClick={closeSidebar} isActive={location.pathname.startsWith('/student/application')} />
              <NavItem to="/student/services" icon={Wrench} label="Послуги" onClick={closeSidebar} isActive={location.pathname.startsWith('/student/services')} />
              <NavItem to="/student/financials" icon={Wallet} label="Оплата" onClick={closeSidebar} isActive={location.pathname.startsWith('/student/financials')} />
            </>
          )}
          {isMaster && (
            <NavItem to="/master/repairs" icon={Wrench} label="Ремонти" onClick={closeSidebar} isActive={location.pathname.startsWith('/master/repairs')} />
          )}
        </div>

        <div className="p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[rgb(var(--accent-soft))] flex items-center justify-center text-[rgb(var(--accent))] font-bold">
                {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[rgb(var(--text))] truncate" title={`${user?.lastName} ${user?.firstName}`}>
                  {user?.lastName} {user?.firstName}
                </p>
                <div className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                  {getRoleLabel(user?.role)}
                </div>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-3))] rounded-lg transition-colors"
              title="Перемкнути тему"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-[rgb(var(--border))] text-sm font-semibold rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))] transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2 text-[rgb(var(--muted))]" />
            Вийти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar for notifications / mobile menu */}
        <header className="h-16 bg-[rgb(var(--surface))] border-b border-[rgb(var(--border))] flex items-center justify-between px-4 md:px-6 flex-shrink-0 transition-colors duration-200">
           <div className="flex items-center md:hidden">
             <button
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 mr-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-2))] rounded-md"
             >
               <Menu className="w-6 h-6" />
             </button>
             <span className="text-lg font-semibold text-[rgb(var(--text))]">Dormitory SaaS</span>
           </div>
           <div className="flex-1" />
           {user?.role === 'STUDENT' && <NotificationBell />}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <MessagesWidget />
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
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
                <Route path="messages" element={<AdminMessagesPage />} />
                <Route path="debts" element={<AdminDebtsPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="audit" element={<AdminAuditLog />} />
                <Route path="*" element={<Navigate to="analytics" replace />} />
              </Routes></Layout>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC']} />}>
              <Route path="/master/*" element={<Layout><Routes>
                <Route path="repairs" element={<MasterRepairsPage />} />
                <Route path="*" element={<Navigate to="repairs" replace />} />
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