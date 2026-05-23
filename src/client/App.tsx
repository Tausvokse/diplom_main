import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
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
    <div className="ui-card p-8 text-center">
      <h1 className="text-2xl font-semibold text-red-500">Доступ заборонено (403)</h1>
    </div>
  </div>
);

const PageLoader = () => (
  <div className="w-full max-w-4xl space-y-4 animate-fadeIn">
    <Skeleton height={28} width={220} borderRadius={14} />
    <Skeleton height={16} width={320} borderRadius={14} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <Skeleton height={160} borderRadius={20} />
      <Skeleton height={160} borderRadius={20} />
    </div>
    <Skeleton height={220} borderRadius={20} />
  </div>
);

const FullScreenLoader = () => (
  <div className="flex items-center justify-center min-h-screen ui-shell p-4">
    <PageLoader />
  </div>
);

// NavItem component — Neumorphic active/hover states
const NavItem = ({ to, icon: Icon, label, onClick, isActive }: { to: string, icon: any, label: string, onClick: () => void, isActive: boolean }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-[rgb(var(--surface))] text-[rgb(var(--accent))] nm-inset-sm'
          : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--surface))] hover:shadow-[var(--nm-raised-xs)]'
      }`}
      style={isActive ? { boxShadow: 'var(--nm-inset-sm)' } : {}}
    >
      <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))]'}`} />
      {label}
    </Link>
  );
};

// Sidebar Layout — Neumorphic
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
    <div className="flex h-screen overflow-hidden transition-colors duration-300">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — Neumorphic raised panel */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 bg-[rgb(var(--surface))] flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}
        style={{ boxShadow: '6px 0 16px rgba(var(--nm-dark), 0.15), -2px 0 8px rgba(var(--nm-light), 0.1)' }}
      >
        {/* Accent gradient strip */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[rgb(var(--accent))] via-[rgb(var(--accent))] to-transparent opacity-60 rounded-r" />
        
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-6">
          <span className="text-xl font-semibold text-[rgb(var(--text))]">Dormitory SaaS</span>
          <button className="md:hidden text-[rgb(var(--muted))] p-1 rounded-lg hover:bg-[rgb(var(--surface-2))]" onClick={closeSidebar}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Separator — neumorphic groove */}
        <div className="mx-4 h-[1px] bg-[rgb(var(--border)/0.3)]" style={{ boxShadow: '0 1px 0 var(--nm-light)' }} />
        
        {/* Navigation */}
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

        {/* User section — Neumorphic inset panel */}
        <div className="p-4">
          <div className="rounded-2xl p-3 bg-[rgb(var(--surface-2))]" style={{ boxShadow: 'var(--nm-inset-sm)' }}>
            <div className="flex items-center justify-between mb-3 gap-1">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-[rgb(var(--accent-soft))] flex items-center justify-center text-[rgb(var(--accent))] font-bold text-sm" style={{ boxShadow: 'var(--nm-raised-xs)' }}>
                  {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-semibold text-[rgb(var(--text))] truncate block" title={`${user?.lastName} ${user?.firstName}`}>
                    {user?.lastName} {user?.firstName}
                  </p>
                  <div className="mt-0.5 flex">
                    <span className="inline-block truncate px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Theme toggle — Neumorphic */}
              <button
                onClick={toggleTheme}
                className="p-1.5 flex-shrink-0 rounded-xl text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-all duration-200"
                style={{ boxShadow: theme === 'dark' ? 'var(--nm-inset-sm)' : 'var(--nm-raised-xs)' }}
                title="Перемкнути тему"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--surface))] transition-all duration-200 hover:translate-y-[-1px]"
              style={{ boxShadow: 'var(--nm-raised-sm)' }}
            >
              <LogOut className="w-4 h-4 mr-2 text-[rgb(var(--muted))]" />
              Вийти
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar — Neumorphic raised strip */}
        <header className="h-16 bg-[rgb(var(--surface))] flex items-center justify-between px-4 md:px-6 flex-shrink-0 transition-colors duration-200"
          style={{ boxShadow: '0 4px 12px var(--nm-dark), 0 -2px 6px var(--nm-light)' }}
        >
           <div className="flex items-center md:hidden">
             <button
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 mr-2 text-[rgb(var(--muted))] rounded-xl hover:text-[rgb(var(--text))]"
               style={{ boxShadow: 'var(--nm-raised-xs)' }}
             >
               <Menu className="w-6 h-6" />
             </button>
             <span className="text-lg font-semibold text-[rgb(var(--text))]">Dormitory SaaS</span>
           </div>
           <div className="flex-1" />
           {user?.role === 'STUDENT' && <NotificationBell />}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
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

const AnimatedStudentRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageTransition><StudentDashboard /></PageTransition>} />
        <Route path="application" element={<PageTransition><ApplicationForm /></PageTransition>} />
        <Route path="services" element={<PageTransition><StudentServices /></PageTransition>} />
        <Route path="financials" element={<PageTransition><StudentFinancials /></PageTransition>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AnimatedAdminRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="analytics" element={<PageTransition><AnalyticsDashboard /></PageTransition>} />
        <Route path="students" element={<PageTransition><DirectorDashboard /></PageTransition>} />
        <Route path="dormitories" element={<PageTransition><DormitoryManager /></PageTransition>} />
        <Route path="applications" element={<PageTransition><ApplicationsReview /></PageTransition>} />
        <Route path="allocation" element={<PageTransition><AllocationDashboard /></PageTransition>} />
        <Route path="users" element={<PageTransition><AdminUsers /></PageTransition>} />
        <Route path="messages" element={<PageTransition><AdminMessagesPage /></PageTransition>} />
        <Route path="debts" element={<PageTransition><AdminDebtsPage /></PageTransition>} />
        <Route path="complaints" element={<PageTransition><AdminComplaintsPage /></PageTransition>} />
        <Route path="announcements" element={<PageTransition><AdminAnnouncementsPage /></PageTransition>} />
        <Route path="audit" element={<PageTransition><AdminAuditLog /></PageTransition>} />
        <Route path="*" element={<Navigate to="analytics" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AnimatedMasterRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="repairs" element={<PageTransition><MasterRepairsPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="repairs" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const RootRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/unauthorized" element={<PageTransition><Unauthorized /></PageTransition>} />
        
        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path="/student/*" element={<Layout><AnimatedStudentRoutes /></Layout>} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT']} />}>
          <Route path="/admin/*" element={<Layout><AnimatedAdminRoutes /></Layout>} />
        </Route>

        {/* Master Routes */}
        <Route element={<ProtectedRoute allowedRoles={['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC']} />}>
          <Route path="/master/*" element={<Layout><AnimatedMasterRoutes /></Layout>} />
        </Route>

        {/* Default Route Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<FullScreenLoader />}>
          <RootRoutes />
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
};

export default App;