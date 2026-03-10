import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, Plus, Package, ArrowRight } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface Nomenclature { id: number; name: string; code: string; }
interface CastingMethod { id: number; name: string; }
interface User { id: number; fullName: string; role: string; department?: string; }
interface PlanItem {
    id: number;
    planDate: string;
    nomenclature: Nomenclature;
    method: CastingMethod;
    plannedQuantity: number;
    priority: number;
    status: string;
    tasks: Task[];
}
interface Task {
    id: number;
    taskNumber: string;
    nomenclature: Nomenclature;
    method: CastingMethod;
    quantity: number;
    assignedUser?: User;
    status: string;
    createdAt: string;
}

export default function MasterDashboard() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<PlanItem[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [nomenclature, setNomenclature] = useState<Nomenclature[]>([]);
    const [methods, setMethods] = useState<CastingMethod[]>([]);
    const [workers, setWorkers] = useState<User[]>([]);

    // Plan Form State
    const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
    const [partCodeId, setPartCodeId] = useState('');
    const [methodId, setMethodId] = useState('');
    const [plannedQuantity, setPlannedQuantity] = useState('');
    const [priority, setPriority] = useState('1');

    // Issue Task State
    const [issuePlanId, setIssuePlanId] = useState<number | null>(null);
    const [issueQuantity, setIssueQuantity] = useState('');
    const [issueWorkerId, setIssueWorkerId] = useState('');
    const { showNotification, confirm } = useNotifications();

    const fetchData = async () => {
        try {
            const [p, t, n, m, u] = await Promise.all([
                api.getPlans(),
                api.getTasks(),
                api.getNomenclature(),
                api.getMethods(),
                api.getUsers()
            ]);
            setPlans(p);
            setTasks(t);
            setNomenclature(n);
            setMethods(m);
            setWorkers(u.filter((x: any) => ['WORKER', 'TECH', 'TRIMMER', 'MOULDER', 'POURER', 'KNOCKER', 'FINISHER'].includes(x.role)));

            if (n.length > 0 && !partCodeId) setPartCodeId(n[0].id.toString());
            if (m.length > 0 && !methodId) setMethodId(m[0].id.toString());
        } catch (e) {
            console.error('Failed to load data', e);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.savePlan({
                planDate,
                partCodeId: Number(partCodeId),
                methodId: Number(methodId),
                plannedQuantity: Number(plannedQuantity),
                priority: Number(priority)
            });
            fetchData();
            setPlannedQuantity('');
            showNotification('Добавлено в производственный план', 'success');
        } catch (e) {
            showNotification('Ошибка добавления плана', 'error');
        }
    };

    const handleDeletePlan = async (id: number) => {
        if (!await confirm({ message: 'Уверены, что хотите удалить пункт плана?', type: 'danger' })) return;
        try {
            await api.deletePlan(id);
            fetchData();
            showNotification('Пункт плана удален', 'success');
        } catch { showNotification('Ошибка удаления', 'error'); }
    };

    const handleIssueTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issuePlanId) return;
        const plan = plans.find(p => p.id === issuePlanId);
        if (!plan) return;

        try {
            await api.saveTask({
                planItemId: plan.id,
                partCodeId: plan.nomenclature.id,
                methodId: plan.method.id,
                quantity: Number(issueQuantity),
                assignedToUserId: issueWorkerId ? Number(issueWorkerId) : null,
            });
            fetchData();
            setIssuePlanId(null);
            setIssueQuantity('');
            setIssueWorkerId('');
            showNotification('Задача успешно выдана', 'success');
        } catch (e) {
            showNotification('Ошибка создания задачи', 'error');
        }
    };

    const handleAssignUser = async (taskId: number, userId: string) => {
        try {
            await api.updateTask(taskId, {
                assignedToUserId: userId ? Number(userId) : null
            });
            fetchData();
        } catch (e) {
            showNotification('Ошибка назначения', 'error');
        }
    };

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        try {
            await api.updateTask(taskId, { status: newStatus });
            fetchData();
        } catch (e) {
            showNotification('Ошибка изменения статуса', 'error');
        }
    };

    const handleDeleteTask = async (id: number) => {
        if (!await confirm({ message: 'Уверены, что хотите удалить задачу?', type: 'danger' })) return;
        try {
            await api.deleteTask(id);
            fetchData();
            showNotification('Задача удалена', 'success');
        } catch { showNotification('Ошибка удаления', 'error'); }
    };

    // Replaced executeDelete with direct handle functions

    if (user?.role !== 'MASTER' && user?.role !== 'ADMIN' && user?.role !== 'DIRECTOR') {
        return <div className="p-8 text-center text-red-500 font-bold">У вас нет прав для просмотра производственного плана</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="text-blue-500" /> Производственный план (АРМ Мастера)
            </h2>

            {/* ====== СЕКЦИЯ ПЛАНА ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Форма добавления в план */}
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 h-fit lg:col-span-1 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-neutral-700 pb-2">
                        <Plus size={18} className="text-green-500" /> Добавить в план
                    </h3>
                    <form onSubmit={handleCreatePlan} className="space-y-4 text-sm">
                        <div>
                            <label className="block text-neutral-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">Дата плана</label>
                            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-neutral-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">Деталь (Номенклатура)</label>
                            <select value={partCodeId} onChange={e => setPartCodeId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors">
                                {nomenclature.map(n => <option key={n.id} value={n.id}>{n.code} - {n.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-neutral-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">Метод Литья</label>
                            <select value={methodId} onChange={e => setMethodId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors">
                                {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">Кол-во (шт)</label>
                                <input type="number" min="1" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors font-mono" />
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">Приоритет</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="1">Обычный</option>
                                    <option value="2">Высокий</option>
                                    <option value="3">Срочный</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors mt-2 shadow-md flex items-center justify-center gap-2">
                            <Plus size={16} /> Добавить в план
                        </button>
                    </form>
                </div>

                {/* Таблица Планов */}
                <div className="lg:col-span-3 bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2 flex items-center justify-between">
                        <span>Сводный Производственный План</span>
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-neutral-900/50 text-neutral-400 border-b border-neutral-700 text-[10px] sm:text-xs">
                                    <th className="p-2 sm:p-3">Дата / Приоритет</th>
                                    <th className="p-2 sm:p-3">ДСП</th>
                                    <th className="p-2 sm:p-3">Метод</th>
                                    <th className="p-2 sm:p-3 text-right">План (шт)</th>
                                    <th className="p-2 sm:p-3 text-right hidden sm:table-cell">Выдано в работу (шт)</th>
                                    <th className="p-2 sm:p-3 text-center">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map(p => {
                                    const issuedTasks = p.tasks || [];
                                    const issuedQuantity = issuedTasks.reduce((acc, t) => acc + t.quantity, 0);
                                    return (
                                        <tr key={p.id} className="border-b border-neutral-700/50 hover:bg-neutral-750 transition-colors">
                                            <td className="p-2 sm:p-3">
                                                <div className="font-bold text-neutral-200">{new Date(p.planDate).toLocaleDateString()}</div>
                                                <div className={`text-[9px] sm:text-[10px] font-bold uppercase ${p.priority === 3 ? 'text-red-400' : p.priority === 2 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                                                    {p.priority === 3 ? 'СРОЧНО' : p.priority === 2 ? 'ВЫСОКИЙ' : 'Обычный'}
                                                </div>
                                            </td>
                                            <td className="p-2 sm:p-3">
                                                <div className="font-bold flex items-center gap-1 text-xs sm:text-sm"><Package size={14} className="text-blue-400 hidden sm:block" /> {p.nomenclature.code}</div>
                                                <div className="text-[10px] sm:text-xs text-neutral-400 hidden sm:block">{p.nomenclature.name}</div>
                                            </td>
                                            <td className="p-2 sm:p-3">
                                                <div className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-purple-900/50 text-purple-200 border border-purple-700/50">{p.method.name}</div>
                                            </td>
                                            <td className="p-2 sm:p-3 text-right font-mono font-bold text-white text-sm sm:text-lg">{p.plannedQuantity}</td>
                                            <td className="p-2 sm:p-3 text-right font-mono font-bold text-green-400 text-sm sm:text-lg hidden sm:table-cell">{issuedQuantity}</td>
                                            <td className="p-2 sm:p-3 text-center space-y-1 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row items-center justify-center">
                                                <button onClick={() => { setIssuePlanId(p.id); setIssueQuantity((p.plannedQuantity - issuedQuantity).toString()); }} className="bg-green-600 hover:bg-green-500 text-white px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-bold transition-colors w-full sm:w-auto">Выдать</button>
                                                <button onClick={() => handleDeletePlan(p.id)} className="text-red-500 hover:text-red-400 underline text-[10px] sm:text-xs w-full sm:w-auto">Удалить</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {plans.length === 0 && (
                                    <tr><td colSpan={6} className="p-6 text-center text-neutral-500">План пуст</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ====== МОДАЛКА ВЫДАЧИ ЗАДАЧИ ====== */}
            {issuePlanId && (() => {
                const plan = plans.find(p => p.id === issuePlanId);
                const isHTS = plan?.method.name.toUpperCase().includes('ХТС');
                const roleLabel = isHTS ? 'Назначить Формовщика' : 'Назначить Литейщика';

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <ArrowRight className="text-green-500" /> Выдача задачи в производство
                            </h3>
                            <form onSubmit={handleIssueTask} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider text-green-400">{roleLabel}</label>
                                    <select value={issueWorkerId} onChange={e => setIssueWorkerId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors">
                                        <option value="">--- Не назначено ---</option>
                                        {workers.map(w => <option key={w.id} value={w.id}>{w.fullName} ({w.role})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Количество, шт</label>
                                    <input type="number" min="1" value={issueQuantity} onChange={e => setIssueQuantity(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono" />
                                </div>
                                <div className="flex gap-4 mt-6">
                                    <button type="button" onClick={() => setIssuePlanId(null)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors shadow-md">Выдать задачу</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* ====== СЕКЦИЯ АКТИВНЫХ ЗАДАЧ ====== */}
            <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg">
                <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2 flex items-center justify-between">
                    <span>Выданные Задачи / Наряды</span>
                    <span className="text-sm font-normal text-neutral-400">Задач в работе: {tasks.filter(t => t.status !== 'DONE').length}</span>
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-neutral-900/50 text-neutral-400 border-b border-neutral-700 text-[10px] sm:text-xs text-center">
                                <th className="p-2 sm:p-3 text-left">Заказ наряд / Дата</th>
                                <th className="p-2 sm:p-3 text-left">Деталь</th>
                                <th className="p-2 sm:p-3 hidden sm:table-cell">Метод / Кол-во</th>
                                <th className="p-2 sm:p-3">Исполнитель</th>
                                <th className="p-2 sm:p-3">Статус</th>
                                <th className="p-2 sm:p-3 text-right hidden sm:table-cell">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => (
                                <tr key={t.id} className="border-b border-neutral-700/50 hover:bg-neutral-750 transition-colors text-center">
                                    <td className="p-2 sm:p-3 text-left">
                                        <div className="font-mono text-[10px] sm:text-xs font-bold text-neutral-300 break-all">{t.taskNumber}</div>
                                        <div className="text-[8px] sm:text-[10px] text-neutral-500">{new Date(t.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-2 sm:p-3 text-left">
                                        <div className="font-bold flex items-center gap-1 text-[10px] sm:text-sm"><Package size={14} className="text-blue-400 hidden sm:block" /> {t.nomenclature.code}</div>
                                        <div className="text-[8px] sm:text-[10px] text-neutral-400 max-w-[100px] sm:max-w-[150px] truncate" title={t.nomenclature.name}>{t.nomenclature.name}</div>
                                        <div className="sm:hidden mt-1">
                                            <span className="font-mono font-bold text-green-400 text-[10px]">{t.quantity} шт</span>
                                        </div>
                                    </td>
                                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                                        <div className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-purple-900/50 text-purple-200 border border-purple-700/50 mb-1 uppercase tracking-wider">{t.method.name}</div>
                                        <div><span className="font-mono font-bold text-green-400">{t.quantity} шт</span></div>
                                    </td>
                                    <td className="p-2 sm:p-3">
                                        <select
                                            value={t.assignedUser?.id || ''}
                                            onChange={(e) => handleAssignUser(t.id, e.target.value)}
                                            className="bg-neutral-900 border border-neutral-700 rounded p-1 sm:p-1.5 text-[10px] sm:text-xs text-white outline-none w-20 sm:w-32 focus:border-blue-500 transition-colors"
                                        >
                                            <option value="">- Нет -</option>
                                            {workers.map(w => <option key={w.id} value={w.id}>{w.fullName.split(' ')[0]}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 sm:p-3">
                                        <select
                                            value={t.status}
                                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                            className={`px-1 sm:px-2 py-1 rounded text-[8px] sm:text-[10px] font-bold outline-none border transition-colors uppercase w-full sm:w-auto
                                                ${t.status === 'DONE' ? 'bg-green-900/30 text-green-400 border-green-700/50' :
                                                    t.status === 'IN_PROGRESS' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' :
                                                        'bg-neutral-900 text-neutral-300 border-neutral-600'}
                                            `}
                                        >
                                            <option value="ASSIGNED">НАЗНАЧЕНО</option>
                                            <option value="IN_PROGRESS">В РАБОТЕ</option>
                                            <option value="DONE">ЗАВЕРШЕНО</option>
                                        </select>
                                        <div className="sm:hidden mt-2 flex justify-center">
                                            <button onClick={() => handleDeleteTask(t.id)} className="text-red-500 hover:text-red-400 text-[10px] font-medium underline uppercase tracking-wider">Удал.</button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right hidden sm:table-cell">
                                        <button onClick={() => handleDeleteTask(t.id)} className="text-red-500 hover:text-red-400 text-[10px] font-medium underline uppercase tracking-wider">Удалить</button>
                                    </td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-neutral-500">Нет активных задач</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Removed legacy deleteConfirm Modal */}
        </div>
    );
}
