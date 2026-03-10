import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, Activity, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DirectorDashboard: React.FC = () => {
    const [defectsStats, setDefectsStats] = useState<{ byDepartment: any[], total: number }>({ byDepartment: [], total: 0 });
    const [costsStats, setCostsStats] = useState<any[]>([]);
    const [productivityStats, setProductivityStats] = useState<{ byDepartment: any[] }>({ byDepartment: [] });
    const [workersStats, setWorkersStats] = useState<any[]>([]);
    const { showNotification } = useNotifications();

    // For issuing tasks
    const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
    const [nomenclatureList, setNomenclatureList] = useState<any[]>([]);
    const [methodsList, setMethodsList] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    // Task form state
    const [newTask, setNewTask] = useState({
        partCodeId: '',
        methodId: '',
        quantity: '',
        assignedToUserId: '',
        priority: '1'
    });

    useEffect(() => {
        fetchStatistics();
        fetchReferenceData();
    }, []);

    const fetchStatistics = async () => {
        const [defects, costs, productivity, workers] = await Promise.all([
            api.getStatisticsDefects(),
            api.getStatisticsCosts(),
            api.getStatisticsProductivity(),
            api.getStatisticsWorkers()
        ]);
        setDefectsStats(defects);
        setCostsStats(costs);
        setProductivityStats(productivity);
        setWorkersStats(workers);
    };

    const fetchReferenceData = async () => {
        const [nom, meth, usr] = await Promise.all([
            api.getNomenclature(),
            api.getMethods(),
            api.getUsers()
        ]);
        setNomenclatureList(nom);
        setMethodsList(meth);
        setUsersList(usr.filter((u: any) => u.role === 'WORKER' || u.role === 'MASTER'));

        if (nom.length > 0 && !newTask.partCodeId) {
            setNewTask(prev => ({ ...prev, partCodeId: nom[0].id.toString() }));
        }
        if (meth.length > 0 && !newTask.methodId) {
            setNewTask(prev => ({ ...prev, methodId: meth[0].id.toString() }));
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.partCodeId || !newTask.methodId || !newTask.assignedToUserId || !newTask.quantity) {
            return showNotification('Пожалуйста, выберите все обязательные параметры (деталь, метод, количество, исполнитель).', 'warning');
        }
        try {
            await api.saveTask(newTask);
            setIsAssignTaskModalOpen(false);
            setNewTask({
                partCodeId: nomenclatureList[0]?.id?.toString() || '',
                methodId: methodsList[0]?.id?.toString() || '',
                quantity: '',
                assignedToUserId: '',
                priority: '1'
            });
            showNotification('Задача успешно назначена', 'success');
        } catch (error: any) {
            console.error(error);
            showNotification('Ошибка при создании задачи: ' + (error.response?.data?.error || 'Неизвестная ошибка'), 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="text-blue-500" />
                        Панель руководителя
                    </h2>
                    <p className="text-neutral-400">Сводная статистика и управление производством</p>
                </div>
                <button
                    onClick={() => setIsAssignTaskModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2"
                >
                    <Plus size={18} />
                    Выдать задачу
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Defect Stats Card */}
                <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        Брак по участкам
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={defectsStats.byDepartment}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label
                                >
                                    {defectsStats.byDepartment.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Productivity Stats Card */}
                <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity className="text-green-500" size={20} />
                        Производительность участков
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productivityStats.byDepartment}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                                <XAxis dataKey="name" stroke="#ccc" />
                                <YAxis stroke="#ccc" />
                                <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#555' }} />
                                <Bar dataKey="value" fill="#10b981" name="Выпущено (кг)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Stats Overview */}
                <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-700 lg:col-span-1">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="text-yellow-500" size={20} />
                        Последние данные по себестоимости
                    </h3>
                    <div className="overflow-y-auto max-h-64">
                        <table className="w-full text-sm text-left text-neutral-300">
                            <thead className="text-xs text-neutral-400 bg-neutral-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">Сплав</th>
                                    <th className="px-3 py-2">Себестоимость (₽/кг)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costsStats.slice(0, 10).map((cost, idx) => (
                                    <tr key={idx} className="border-b border-neutral-700">
                                        <td className="px-3 py-2">{cost.alloy}</td>
                                        <td className="px-3 py-2 font-medium text-white">{cost.costPerKg}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Costs Table */}
            <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-700">
                <h3 className="text-lg font-semibold text-white mb-4">Детализация себестоимости плавок</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-300">
                        <thead className="text-xs text-neutral-400 bg-neutral-700">
                            <tr>
                                <th className="px-4 py-3">№ Плавки</th>
                                <th className="px-4 py-3">Дата</th>
                                <th className="px-4 py-3">Сплав</th>
                                <th className="px-4 py-3">Общ. затраты (₽)</th>
                                <th className="px-4 py-3">Общ. вес год (кг)</th>
                                <th className="px-4 py-3">Себестоимость (₽/кг)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costsStats.map(cost => (
                                <tr key={cost.id} className="border-b border-neutral-700 hover:bg-neutral-600">
                                    <td className="px-4 py-3">{cost.meltNumber}</td>
                                    <td className="px-4 py-3">{cost.date}</td>
                                    <td className="px-4 py-3 text-blue-400">{cost.alloy}</td>
                                    <td className="px-4 py-3">{cost.totalCost.toLocaleString('ru-RU')}</td>
                                    <td className="px-4 py-3">{cost.totalGoodMass}</td>
                                    <td className="px-4 py-3 font-bold text-white">{cost.costPerKg}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Worker Leaderboard */}
            <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-700">
                <h3 className="text-lg font-semibold text-white mb-4">Рейтинг литейщиков (KPI)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-300">
                        <thead className="text-xs text-neutral-400 bg-neutral-700">
                            <tr>
                                <th className="px-4 py-3">Сотрудник</th>
                                <th className="px-4 py-3">Цех</th>
                                <th className="px-4 py-3">Сделано плавок</th>
                                <th className="px-4 py-3 text-green-400">Принято (шт)</th>
                                <th className="px-4 py-3 text-red-500">Брак (шт)</th>
                                <th className="px-4 py-3 font-bold">% Брака</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...workersStats].sort((a, b) => b.acceptedQty - a.acceptedQty).map(worker => {
                                const total = worker.acceptedQty + worker.rejectedQty;
                                const defectRate = total > 0 ? ((worker.rejectedQty / total) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={worker.id} className="border-b border-neutral-700 hover:bg-neutral-600 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{worker.fullName}</td>
                                        <td className="px-4 py-3">{worker.department}</td>
                                        <td className="px-4 py-3 font-mono">{worker.totalMelts}</td>
                                        <td className="px-4 py-3 font-mono text-green-400 font-bold">{worker.acceptedQty}</td>
                                        <td className="px-4 py-3 font-mono text-red-500 font-bold">{worker.rejectedQty}</td>
                                        <td className="px-4 py-3 font-mono">
                                            <span className={`px-2 py-1 rounded bg-opacity-20 ${Number(defectRate) > 5 ? 'text-red-400 bg-red-400' : 'text-green-400 bg-green-400'}`}>
                                                {defectRate}%
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assign Task Modal */}
            {isAssignTaskModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md border border-neutral-700 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4">Назначение задачи</h3>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Деталь</label>
                                <select
                                    className="w-full bg-neutral-700 border border-neutral-600 text-white rounded px-3 py-2"
                                    value={newTask.partCodeId}
                                    onChange={e => setNewTask({ ...newTask, partCodeId: e.target.value })}
                                    required
                                >
                                    <option value="">Выберите деталь</option>
                                    {nomenclatureList.map(n => (
                                        <option key={n.id} value={n.id}>{n.code} - {n.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Метод литья</label>
                                <select
                                    className="w-full bg-neutral-700 border border-neutral-600 text-white rounded px-3 py-2"
                                    value={newTask.methodId}
                                    onChange={e => setNewTask({ ...newTask, methodId: e.target.value })}
                                    required
                                >
                                    <option value="">Выберите метод</option>
                                    {methodsList.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Количество</label>
                                <input
                                    type="number"
                                    className="w-full bg-neutral-700 border border-neutral-600 text-white rounded px-3 py-2"
                                    value={newTask.quantity}
                                    onChange={e => setNewTask({ ...newTask, quantity: e.target.value })}
                                    required min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Исполнитель (Мастер/Рабочий)</label>
                                <select
                                    className="w-full bg-neutral-700 border border-neutral-600 text-white rounded px-3 py-2"
                                    value={newTask.assignedToUserId}
                                    onChange={e => setNewTask({ ...newTask, assignedToUserId: e.target.value })}
                                    required
                                >
                                    <option value="">Виберите сотрудника</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.fullName} ({u.role === 'MASTER' ? 'Мастер' : 'Рабочий'} {u.department ? `- ${u.department}` : ''})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsAssignTaskModalOpen(false)} className="flex-1 bg-neutral-600 hover:bg-neutral-500 text-white py-2 rounded font-medium">
                                    Отмена
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium">
                                    Назначить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectorDashboard;
