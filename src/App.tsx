import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Bell, Menu, Play } from 'lucide-react';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';

// Components
import Sidebar from './components/Layout/Sidebar';
import { ProtectedRoute, AdminRoute, RoleRoute } from './components/Auth/ProtectedRoutes';
import Login from './components/Auth/Login';
import AdminPanel from './components/Admin/AdminPanel';
import DemoOnboarding from './components/Demo/DemoOnboarding';

// Pages
import ChargeCalculator from './pages/ChargeCalculator';
import Correction from './pages/Correction';
import Ledger from './pages/Ledger';
import References from './pages/References';
import Instructions from './pages/Instructions';
import MasterDashboard from './pages/MasterDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import OTCDashboard from './pages/OTCDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import DirectorTasks from './pages/DirectorTasks';
import MyDirectorTasks from './pages/MyDirectorTasks';
import SalesDashboard from './pages/SalesDashboard';
import MasterOrders from './pages/MasterOrders';
import ProductionBoard from './pages/ProductionBoard';
import ProductionStats from './pages/ProductionStats';
import MyTraining from './pages/Training/MyTraining';
import TrainingAdmin from './pages/Training/TrainingAdmin';
import CompetencyMatrix from './pages/Training/CompetencyMatrix';
import TMCDashboard from './pages/Warehouse/TMCDashboard';
import StorekeeperDashboard from './pages/Warehouse/StorekeeperDashboard';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  const redirects: Record<string, string> = {
    ADMIN: '/admin',
    DIRECTOR: '/director',
    MASTER: '/plan',
    TECHNOLOGIST: '/calculator',
    OTC: '/otc',
    TMC: '/tmc',
    STOREKEEPER: '/storekeeper',
    WORKER: '/worker',
    TRAINER: '/admin/training',
    SALES: '/sales',
  };

  return <Navigate to={redirects[user.role] || '/worker'} />;
}

/**
 * MainLayout handles the authenticated UI shell (Sidebar, Header)
 * and the main content routes. 
 */
function MainLayout() {
  const { user, isAuthenticated, isLoading, logout, simulatedRole, setSimulatedRole, originalRole } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const { unreadCounts } = useNotifications();

  // Automatically show demo tour for demo users once per session
  useEffect(() => {
    const isDemo = originalRole === 'DEMO' || user?.role === 'DEMO' || user?.login === 'demo' || user?.id === -1;
    if (isDemo && !sessionStorage.getItem('demoPresentationShown')) {
      setShowDemoTour(true);
      sessionStorage.setItem('demoPresentationShown', 'true');
    }
  }, [user, originalRole]);

  // IMPORTANT: Show loading screen until auth is initialized
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-neutral-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Инициализация системы...
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Fallback for user being null even if authenticated
  if (!user) return null;

  // We only want to trigger the automatic demo tour once per session load,
  // or they can trigger it manually. For simplicity, since the state defaults to false,
  // we could just let them launch it via the button, reducing annoyance.
  // Actually, let's keep it manual via the button to prevent it popping up on *every* refresh.

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-inter selection:bg-red-500/30">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* 
        Dynamic margin based on sidebar state:
        - lg:ml-20 when collapsed (Sidebar.tsx w-20)
        - lg:ml-64 when expanded (Sidebar.tsx w-64)
      */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {(originalRole === 'DEMO' || user.role === 'DEMO' || user.login === 'demo' || user.id === -1) && (
          <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center sticky top-0 z-[60] shadow-lg">
            Внимание: Демонстрационный режим • Изменение данных недоступно
          </div>
        )}
        {showDemoTour && <DemoOnboarding onClose={() => setShowDemoTour(false)} />}
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 shrink-0">
          <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors lg:hidden"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-black tracking-tighter text-white hidden sm:block">
                LITEXAL <span className="text-red-600">ERP</span>
              </h1>
            </div>

            <div className="flex items-center gap-6">
              {/* User Profile */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-white leading-tight">{user.fullName || user.login}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center justify-end gap-1">
                    {({
                      ADMIN: 'Администратор',
                      DIRECTOR: 'Руководитель',
                      MASTER: 'Мастер участка',
                      TECHNOLOGIST: 'Технолог',
                      OTC: 'Инспектор ОТК',
                      TMC: 'Менеджер ТМЦ',
                      STOREKEEPER: 'Кладовщик',
                      WORKER: 'Рабочий',
                      TRAINER: 'Инструктор',
                      SALES: 'Менеджер продаж',
                      MELTER: 'Плавильщик',
                      CASTER: 'Заливщик',
                      MOULDER: 'Формовщик',
                      KNOCKER: 'Выбивщик',
                      FINISHER: 'Доработчик',
                      DEMO: 'Демо-пользователь',
                    } as any)[user.role] || user.role} {user.department ? `· ${user.department}` : ''}
                  </div>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-600">
                  <UserIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                
                {/* 
                  Check if user is the DEMO user.
                  Since originalRole might face state sync issues on hard refresh, 
                  we also check user.login === 'demo' or user.id === -1 as a robust fallback.
                */}
                {(originalRole === 'DEMO' || user.role === 'DEMO' || user.login === 'demo' || user.id === -1) && (
                  <div className="flex items-center gap-2 mr-4 group/selector">
                    <div className="relative group z-50">
                      <select 
                        value={simulatedRole || 'DEMO'} 
                        onChange={(e) => setSimulatedRole(e.target.value === 'DEMO' ? null : e.target.value)}
                        className={`bg-neutral-800 border-2 ${!simulatedRole ? 'border-red-600/50 animate-pulse' : 'border-neutral-700'} text-white text-[9px] sm:text-[10px] font-bold py-1 sm:py-1.5 px-1.5 sm:px-3 max-w-[100px] sm:max-w-none rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 uppercase tracking-tighter cursor-pointer hover:border-red-500 transition-all`}
                        title="Сменить роль для ознакомления"
                      >
                        <option value="DEMO">Режим: Обзор</option>
                        <option value="DIRECTOR">Вид: Директор</option>
                        <option value="MASTER">Вид: Мастер</option>
                        <option value="TECHNOLOGIST">Вид: Технолог</option>
                        <option value="OTC">Вид: ОТК</option>
                        <option value="TMC">Вид: ТМЦ / Склад</option>
                        <option value="WORKER">Вид: Рабочий</option>
                        <option value="SALES">Вид: Продажи</option>
                      </select>
                      {!simulatedRole && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover/selector:opacity-100 transition-opacity pointer-events-none uppercase">
                          Смени роль здесь!
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {(originalRole === 'DEMO' || user.role === 'DEMO' || user.login === 'demo' || user.id === -1) && (
                  <button 
                    onClick={() => setShowDemoTour(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-yellow-500/20 transition-all uppercase tracking-tighter"
                  >
                    <Play size={10} fill="currentColor" className="sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Презентация</span>
                    <span className="sm:hidden">През.</span>
                  </button>
                )}

                {/* Notifications Bell */}
                <div className="relative mr-4">
                  <button className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors relative group">
                    <Bell size={20} />
                    {unreadCounts.total > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-neutral-900">
                        {unreadCounts.total}
                      </span>
                    )}

                    {/* Tooltip on hover */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl p-3 invisible group-hover:visible transition-all z-50">
                      <p className="text-xs font-bold text-white mb-2 pb-1 border-b border-neutral-700">Уведомления</p>
                      {unreadCounts.training > 0 && <p className="text-[10px] text-neutral-400 mb-1">Обучение: <span className="text-red-400 font-bold">{unreadCounts.training}</span></p>}
                      {unreadCounts.tasks > 0 && <p className="text-[10px] text-neutral-400">Задачи: <span className="text-red-400 font-bold">{unreadCounts.tasks}</span></p>}
                      {unreadCounts.total === 0 && <p className="text-[10px] text-neutral-500 italic">Нет новых уведомлений</p>}
                    </div>
                  </button>
                </div>

                <div className="h-9 w-12 border-l border-neutral-700 mr-2 md:block hidden" />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-l border-neutral-700 pl-6 shrink-0">
                <a href="https://litexal.ru" target="_blank" rel="noreferrer" className="text-xs font-bold text-red-500 hover:text-red-400 mr-2 transition-colors hidden sm:inline-block">
                  LITEXAL.RU ↗
                </a>
                <button
                  onClick={logout}
                  className="p-1 sm:p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  title="Выход"
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline-block text-sm font-medium">Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Protected Pages */}
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/plan" element={<ProtectedRoute><MasterDashboard /></ProtectedRoute>} />
            <Route path="/worker" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
            <Route path="/otc" element={<ProtectedRoute><OTCDashboard /></ProtectedRoute>} />
            <Route path="/director" element={<ProtectedRoute><DirectorDashboard /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><ChargeCalculator /></ProtectedRoute>} />
            <Route path="/correction" element={<ProtectedRoute><Correction /></ProtectedRoute>} />
            <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
            <Route path="/references" element={<ProtectedRoute><References /></ProtectedRoute>} />
            <Route path="/instructions" element={<ProtectedRoute><Instructions /></ProtectedRoute>} />
            <Route path="/director-tasks" element={<ProtectedRoute><DirectorTasks /></ProtectedRoute>} />
            <Route path="/my-director-tasks" element={<ProtectedRoute><MyDirectorTasks /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/master-orders" element={<ProtectedRoute><MasterOrders /></ProtectedRoute>} />
            <Route path="/production-board" element={<ProtectedRoute><ProductionBoard /></ProtectedRoute>} />
            <Route path="/production-stats" element={<RoleRoute roles={['MASTER', 'ADMIN', 'DIRECTOR']}><ProductionStats /></RoleRoute>} />
            <Route path="/training" element={<ProtectedRoute><MyTraining /></ProtectedRoute>} />
            <Route path="/admin/training" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'TRAINER']}><TrainingAdmin /></RoleRoute>} />
            <Route path="/director/matrix" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'TRAINER']}><CompetencyMatrix /></RoleRoute>} />
            <Route path="/tmc" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'TMC']}><TMCDashboard /></RoleRoute>} />
            <Route path="/storekeeper" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'STOREKEEPER']}><StorekeeperDashboard /></RoleRoute>} />
            
            {/* Catch-all redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Login is a standalone route outside MainLayout to avoid sidebars/headers on login page */}
            <Route path="/login" element={<Login />} />
            
            {/* All other routes go through MainLayout (handles auth check + layout) */}
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
