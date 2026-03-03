
import { NavLink } from 'react-router-dom';
import {
    ClipboardList, Package, Beaker, FileText,
    Users, Settings, Activity, ShieldCheck, PieChart, Menu, ChevronLeft, Briefcase, ClipboardCheck, ShoppingCart, BookOpen, LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const { user } = useAuth();

    if (!user) return null;

    const isWorker = user.role === 'WORKER';
    const isOtk = user.role === 'OTK' || user.role === 'OTC';
    const isAdmin = user.role === 'ADMIN';
    const isDirector = user.role === 'DIRECTOR';
    const isMaster = user.role === 'MASTER';
    const isTech = user.role === 'TECH' || user.role === 'TECHNOLOGIST';
    const isSales = user.role === 'SALES';

    const showTechModules = !isWorker && !isOtk && !isSales;

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive
            ? 'bg-blue-600/90 text-white shadow-sm'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
        }`;

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`fixed top-0 left-0 z-50 h-screen bg-neutral-900 border-r border-neutral-800 transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800 shrink-0">
                    <div className={`flex items-center gap-3 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>
                        <img src="/logo.svg" alt="ЛИТЭКС" className="h-8 w-auto shrink-0" />
                        <span className="font-bold text-white tracking-widest whitespace-nowrap">ЛИТЭКС</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors lg:hidden"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors absolute right-4"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
                    <nav className="space-y-6" onClick={() => { if (window.innerWidth < 1024) setIsOpen(false); }}>
                        {/* Group: Производство — NOT for Sales */}
                        {(isMaster || isWorker || isOtk || isAdmin || isDirector || isTech) && (
                            <div>
                                {isOpen && <h4 className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Производство</h4>}
                                <div className="space-y-1">
                                    {(isMaster || isAdmin || isDirector || isTech) && (
                                        <NavLink to="/plan" className={navLinkClasses} title="План">
                                            <Briefcase size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Сменное задание</span>
                                        </NavLink>
                                    )}
                                    {(isWorker || isMaster || isAdmin) && (
                                        <NavLink to="/worker" className={navLinkClasses} title={user?.department ? `Мои Задачи (${user.department})` : 'Мои Задачи'}>
                                            <Activity size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Мои Задачи</span>
                                        </NavLink>
                                    )}
                                    {(isOtk || isAdmin || isMaster || isDirector) && (
                                        <NavLink to="/otc" className={navLinkClasses} title="ОТК">
                                            <ShieldCheck size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>ОТК и Инспекция</span>
                                        </NavLink>
                                    )}
                                    {/* Director tasks — for non-sales production staff viewing their own assigned tasks */}
                                    <NavLink to="/my-director-tasks" className={navLinkClasses} title="Мои поручения">
                                        <ClipboardCheck size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Мои поручения</span>
                                    </NavLink>
                                    {/* Issue tasks - specifically for Master to issue tasks to workers in his production group */}
                                    {isMaster && (
                                        <NavLink to="/director-tasks" className={navLinkClasses} title="Выдать поручение">
                                            <Briefcase size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Задачи сотрудникам</span>
                                        </NavLink>
                                    )}
                                    {(isMaster || isAdmin) && (
                                        <NavLink to="/master-orders" className={navLinkClasses} title="Заказы в работе">
                                            <Package size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Заказы в работе</span>
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Group: Продажи — SALES only (+ Director/Admin also see it) */}
                        {(isSales || isDirector || isAdmin) && (
                            <div>
                                {isOpen && <h4 className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Продажи</h4>}
                                <div className="space-y-1">
                                    <NavLink to="/sales" className={navLinkClasses} title="Заказы от клиентов">
                                        <ShoppingCart size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Заказы от клиентов</span>
                                    </NavLink>
                                </div>
                            </div>
                        )}

                        {/* Group: Инженерия и Лаборатория */}
                        {showTechModules && (
                            <div>
                                {isOpen && <h4 className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Инженерия</h4>}
                                <div className="space-y-1">
                                    <NavLink to="/calculator" className={navLinkClasses} title="Расчёт шихты">
                                        <Beaker size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Расчёт шихты</span>
                                    </NavLink>
                                    <NavLink to="/correction" className={navLinkClasses} title="Дошихтовка">
                                        <Settings size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Дошихтовка</span>
                                    </NavLink>
                                    {!isWorker && (
                                        <>
                                            <NavLink to="/ledger" className={navLinkClasses} title="Журнал плавок">
                                                <ClipboardList size={20} className="shrink-0" />
                                                <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Журнал плавок</span>
                                            </NavLink>
                                            <NavLink to="/references" className={navLinkClasses} title="Справочники">
                                                <Package size={20} className="shrink-0" />
                                                <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Справочники</span>
                                            </NavLink>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Group: База Знаний и Обучение */}
                        <div>
                            {isOpen && <h4 className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Знания и Обучение</h4>}
                            <div className="space-y-1">
                                <NavLink to="/instructions" className={navLinkClasses} title="Инструкции">
                                    <FileText size={20} className="shrink-0" />
                                    <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Инструкции</span>
                                </NavLink>
                                <NavLink to="/training" className={navLinkClasses} title="Мое обучение">
                                    <BookOpen size={20} className="shrink-0" />
                                    <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Мое обучение</span>
                                </NavLink>
                                {(isAdmin || isDirector) && (
                                    <>
                                        <NavLink to="/admin/training" className={navLinkClasses} title="Управление обучением">
                                            <Settings size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Управл. обучением</span>
                                        </NavLink>
                                        <NavLink to="/director/matrix" className={navLinkClasses} title="Матрица компетенций">
                                            <LayoutGrid size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Матрица компетенций</span>
                                        </NavLink>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Group: Управление */}
                        {(isAdmin || isDirector) && (
                            <div>
                                {isOpen && <h4 className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Управление</h4>}
                                <div className="space-y-1">
                                    <NavLink to="/director" className={navLinkClasses} title="Воронка ДП">
                                        <PieChart size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Воронка (Аналитика)</span>
                                    </NavLink>
                                    {isAdmin && (
                                        <NavLink to="/admin" className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive ? 'bg-red-600/90 text-white shadow-sm' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium'
                                            }`
                                        } title="Администрирование">
                                            <Users size={20} className="shrink-0" />
                                            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Администрирование</span>
                                        </NavLink>
                                    )}
                                    {/* Director Task System - for Director/Admin */}
                                    <NavLink to="/director-tasks" className={navLinkClasses} title="Задачи">
                                        <ClipboardCheck size={20} className="shrink-0" />
                                        <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'lg:hidden'}`}>Задачи сотрудникам</span>
                                    </NavLink>
                                </div>
                            </div>
                        )}
                    </nav>
                </div>
            </aside>
        </>
    );
}
