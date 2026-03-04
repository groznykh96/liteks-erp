import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import ChargeCalculator from './pages/ChargeCalculator';
import Correction from './pages/Correction';
import Ledger from './pages/Ledger';
import References from './pages/References';
import Instructions from './pages/Instructions';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, RoleRoute } from './components/Auth/ProtectedRoutes';
import Login from './components/Auth/Login';
import AdminPanel from './components/Admin/AdminPanel';
import MasterDashboard from './pages/MasterDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import OTCDashboard from './pages/OTCDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import Sidebar from './components/Layout/Sidebar';
import DirectorTasks from './pages/DirectorTasks';
import MyDirectorTasks from './pages/MyDirectorTasks';
import SalesDashboard from './pages/SalesDashboard';
import MasterOrders from './pages/MasterOrders';
import MyTraining from './pages/Training/MyTraining';
import TrainingAdmin from './pages/Training/TrainingAdmin';
import CompetencyMatrix from './pages/Training/CompetencyMatrix';
import './App.css';

function HeaderTitle() {
  const location = useLocation();
  const path = location.pathname;

  let title = 'ERP Система ЛИТЭКС v2.0';
  if (path.startsWith('/admin')) title = 'Администрирование';
  else if (path.startsWith('/plan')) title = 'Сменное задание / План';
  else if (path.startsWith('/worker')) title = 'Мои Задачи (РМ Литейщика)';
  else if (path.startsWith('/otc')) title = 'ОТК и Инспекция качества';
  else if (path.startsWith('/director-tasks')) title = 'Управление задачами';
  else if (path.startsWith('/director')) title = 'Аналитика и Воронка ДП';
  else if (path.startsWith('/calculator')) title = 'Расчёт шихты';
  else if (path.startsWith('/correction')) title = 'Дошихтовка';
  else if (path.startsWith('/ledger')) title = 'Журнал произведенных плавок';
  else if (path.startsWith('/references')) title = 'Справочники системы';
  else if (path.startsWith('/instructions')) title = 'База знаний / Инструкции';
  else if (path.startsWith('/my-director-tasks')) title = 'Мои задания от руководителя';
  else if (path.startsWith('/sales')) title = 'Заказы от клиентов';
  else if (path.startsWith('/master-orders')) title = 'Производственные заказы';

  return (
    <div className="flex items-center gap-2">
      <span className="hidden lg:inline text-neutral-500">ЛИТЭКС ERP</span>
      <span className="hidden lg:inline text-neutral-600">/</span>
      <span className="text-white font-bold tracking-wide">{title}</span>
    </div>
  );
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-neutral-400">Инициализация сессии...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'WORKER': return <Navigate to="/worker" replace />;
    case 'MASTER': return <Navigate to="/plan" replace />;
    case 'OTK':
    case 'OTC': return <Navigate to="/otc" replace />;
    case 'DIRECTOR': return <Navigate to="/director" replace />;
    case 'ADMIN': return <Navigate to="/admin" replace />;
    case 'SALES': return <Navigate to="/sales" replace />;
    case 'TRAINER': return <Navigate to="/admin/training" replace />;
    default: return <Navigate to="/calculator" replace />;
  }
}

function MainLayout() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <HashRouter>
      <div className="min-h-screen bg-neutral-900 flex text-neutral-100 font-sans">

        {/* Render Sidebar only if user is logged in */}
        {user && (
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        )}

        {/* Main Content Wrapper */}
        <div className={`flex-1 flex flex-col min-h-[100dvh] transition-all duration-300 overflow-hidden ${user ? 'lg:ml-20' : ''}`}>

          {/* Header */}
          {user && (
            <header className="bg-neutral-800 border-b border-neutral-700 shadow-sm sticky top-0 z-40">
              <div className="px-4 py-3 flex items-center justify-between h-16">

                {/* Mobile hamburger menu button & Title */}
                <div className="flex items-center gap-3 text-sm font-medium text-neutral-200 flex-1 min-w-0">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-1.5 -ml-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors lg:hidden shrink-0"
                    title="Открыть меню"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="truncate shrink-0">
                    <HeaderTitle />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* User Profile */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="font-semibold text-sm leading-tight text-white">{user.fullName || user.login}</div>
                      <div className="text-xs text-neutral-400">
                        {user.role} {user.department ? `· ${user.department}` : ''}
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-600">
                      <UserIcon size={18} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-l border-neutral-700 pl-6 shrink-0">
                    <a href="https://litexal.ru" target="_blank" rel="noreferrer" className="text-xs font-bold text-red-500 hover:text-red-400 mr-2 transition-colors hidden sm:inline-block">
                      LITEXAL.RU ↗
                    </a>
                    <button
                      onClick={logout}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                      title="Выход"
                    >
                      <LogOut size={18} />
                      <span className="hidden sm:inline-block text-sm font-medium">Выйти</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>
          )}

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Route for Dashboard Smart Redirect */}
              <Route path="/" element={<HomeRedirect />} />

              {/* Modules */}
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

              {/* Training and Instructions Modules */}
              <Route path="/training" element={<ProtectedRoute><MyTraining /></ProtectedRoute>} />
              <Route path="/admin/training" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'TRAINER']}><TrainingAdmin /></RoleRoute>} />
              <Route path="/director/matrix" element={<RoleRoute roles={['ADMIN', 'DIRECTOR', 'TRAINER']}><CompetencyMatrix /></RoleRoute>} />
            </Routes>
          </main>

        </div>
      </div>
    </HashRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
