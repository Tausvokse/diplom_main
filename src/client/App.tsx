import React, { Suspense, useState, useEffect } from 'react';
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
import styles from './App.module.css';
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
  <div className={`${styles.unauthorizedContainer} ui-shell`}>
    <div className={`ui-card ${styles.unauthorizedCard}`}>
      <h1 className={styles.unauthorizedText}>Доступ заборонено (403)</h1>
    </div>
  </div>
);

const PageLoader = () => (
  <div className={styles.pageLoader}>
    <Skeleton height={28} width={220} borderRadius={14} />
    <Skeleton height={16} width={320} borderRadius={14} />
    <div className={styles.pageLoaderGrid}>
      <Skeleton height={160} borderRadius={20} />
      <Skeleton height={160} borderRadius={20} />
    </div>
    <Skeleton height={220} borderRadius={20} />
  </div>
);

const FullScreenLoader = () => (
  <div className={`${styles.fullScreenLoader} ui-shell`}>
    <PageLoader />
  </div>
);

import { socketService } from './services/socket';
import toast from 'react-hot-toast';

// NavItem component — Neumorphic active/hover states
const NavItem = ({ to, icon: Icon, label, onClick, isActive, hasNotification }: { to: string, icon: any, label: string, onClick: () => void, isActive: boolean, hasNotification?: boolean }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive} ${isActive ? 'nm-inset-sm' : ''}`}
      style={isActive ? { boxShadow: 'var(--nm-inset-sm)' } : {}}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Icon className={`${styles.navItemIcon} ${isActive ? styles.navItemIconActive : styles.navItemIconInactive}`} />
        {hasNotification && <div className={styles.navNotificationDot} />}
      </div>
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
  const [adminNotifications, setAdminNotifications] = useState({
    applications: false,
    complaints: false,
    messages: false
  });

  useEffect(() => {
    socketService.connect();
    const socket = socketService.getSocket();

    if (socket) {
      socket.on('new_application', (app: any) => {
        setAdminNotifications(prev => ({ ...prev, applications: true }));
        toast('Нова заява від студента!', { icon: '📄' });
      });

      socket.on('new_complaint', (complaint: any) => {
        setAdminNotifications(prev => ({ ...prev, complaints: true }));
        toast.error(`Нова скарга від ${complaint.accuser.fullName}`);
      });

      socket.on('new_message', (msg: any) => {
        if (!location.pathname.includes('/messages')) {
          setAdminNotifications(prev => ({ ...prev, messages: true }));
        }
      });
      
      socket.on('new_notification', (notif: any) => {
        toast(notif.title, { icon: '🔔' });
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [location.pathname]);

  // Reset notification dot when visiting the page
  useEffect(() => {
    if (location.pathname.startsWith('/admin/applications')) {
      setAdminNotifications(prev => ({ ...prev, applications: false }));
    }
    if (location.pathname.startsWith('/admin/complaints')) {
      setAdminNotifications(prev => ({ ...prev, complaints: false }));
    }
    if (location.pathname.startsWith('/admin/messages')) {
      setAdminNotifications(prev => ({ ...prev, messages: false }));
    }
  }, [location.pathname]);

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
    <div className={styles.layoutContainer}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — Neumorphic raised panel */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
        style={{ boxShadow: '6px 0 16px rgba(var(--nm-dark), 0.15), -2px 0 8px rgba(var(--nm-light), 0.1)' }}
      >
        {/* Accent gradient strip */}
        <div className={styles.accentStrip} />
        
        {/* Logo area */}
        <div className={styles.logoArea}>
          <span className={styles.logoText}>Dormitory SaaS</span>
          <button className={styles.closeButton} onClick={closeSidebar}>
            <X className={styles.icon} />
          </button>
        </div>

        {/* Separator — neumorphic groove */}
        <div className={styles.separator} style={{ boxShadow: '0 1px 0 var(--nm-light)' }} />
        
        {/* Navigation */}
        <div className={styles.navContainer}>
          {isAdmin && (
            <>
              <NavItem to="/admin/analytics" icon={LayoutDashboard} label="Аналітика" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/analytics')} />
              <NavItem to="/admin/students" icon={Users} label="Студенти" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/students')} />
              <NavItem to="/admin/dormitories" icon={Building2} label="Гуртожитки" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/dormitories')} />
              <NavItem to="/admin/applications" icon={FileText} label="Заяви" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/applications')} hasNotification={adminNotifications.applications} />
              <NavItem to="/admin/allocation" icon={GitMerge} label="Поселення" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/allocation')} />
              <NavItem to="/admin/debts" icon={CreditCard} label="Боржники" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/debts')} />
              <NavItem to="/admin/complaints" icon={AlertTriangle} label="Скарги" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/complaints')} hasNotification={adminNotifications.complaints} />
              <NavItem to="/admin/announcements" icon={Megaphone} label="Оголошення" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/announcements')} />
              <NavItem to="/admin/audit" icon={Shield} label="Аудит" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/audit')} />
              <NavItem to="/admin/users" icon={UsersRound} label="Користувачі" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/users')} />
              <NavItem to="/admin/messages" icon={MessageSquare} label="Чати" onClick={closeSidebar} isActive={location.pathname.startsWith('/admin/messages')} hasNotification={adminNotifications.messages} />
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
        <div className={styles.userSection}>
          <div className={styles.userCard} style={{ boxShadow: 'var(--nm-inset-sm)' }}>
            <div className={styles.userHeader}>
              <div className={styles.userInfo}>
                <div className={styles.userAvatar} style={{ boxShadow: 'var(--nm-raised-xs)' }}>
                  {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
                </div>
                <div className={styles.userDetails}>
                  <p className={styles.userName} title={`${user?.lastName} ${user?.firstName}`}>
                    {user?.lastName} {user?.firstName}
                  </p>
                  <div className={styles.userRoleWrapper}>
                    <span className={styles.userRole}>
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Theme toggle — Neumorphic */}
              <button
                onClick={toggleTheme}
                className={styles.themeToggle}
                style={{ boxShadow: theme === 'dark' ? 'var(--nm-inset-sm)' : 'var(--nm-raised-xs)' }}
                title="Перемкнути тему"
              >
                {theme === 'light' ? <Moon className={styles.smallIcon} /> : <Sun className={styles.smallIcon} />}
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              style={{ boxShadow: 'var(--nm-raised-sm)' }}
            >
              <LogOut className={styles.logoutIcon} />
              Вийти
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Top bar — Neumorphic raised strip */}
        <header className={styles.header}
          style={{ boxShadow: '0 4px 12px var(--nm-dark), 0 -2px 6px var(--nm-light)' }}
        >
           <div className={styles.mobileHeader}>
             <button
               onClick={() => setIsSidebarOpen(true)}
               className={styles.menuButton}
               style={{ boxShadow: 'var(--nm-raised-xs)' }}
             >
               <Menu className={styles.icon} />
             </button>
             <span className={styles.headerTitle}>Dormitory SaaS</span>
           </div>
           <div className={styles.spacer} />
           {user?.role === 'STUDENT' && <NotificationBell />}
        </header>

        <main className={styles.mainArea}>
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
  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

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