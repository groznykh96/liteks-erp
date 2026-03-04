import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { LayoutGrid, ArrowRight, UserPlus } from 'lucide-react';

interface Worker {
    id: number;
    fullName: string;
    role?: string;
}

interface Stage {
    id: number;
    stage: string;
    stageLabel: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
    workerId: number | null;
    worker: Worker | null;
    qtyIn: number | null;
    qtyOut: number | null;
    qtyRejected: number | null;
}

interface Batch {
    id: number;
    batchNumber: string;
    currentStage: string;
    currentStageLabel: string;
    task: {
        taskNumber: string;
        nomenclature: { code: string; name: string };
        method: { name: string };
    };
    stages: Stage[];
}

export default function ProductionBoard() {
    const { user } = useAuth();
    const canAssign = user && ['MASTER', 'ADMIN', 'DIRECTOR'].includes(user.role);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [users, setUsers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    const [assignModal, setAssignModal] = useState<{ isOpen: boolean; stageId: number | null }>({
        isOpen: false, stageId: null
    });
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [boardData, usersData] = await Promise.all([
                api.getStagesBoard(),
                api.getUsers()
            ]);
            setBatches(boardData);
            setUsers(usersData);
        } catch (e) {
            console.error('Failed to load board data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModal.stageId) return;
        try {
            await api.assignStageWorker(assignModal.stageId, {
                workerId: selectedWorkerId ? parseInt(selectedWorkerId) : null
            });
            setAssignModal({ isOpen: false, stageId: null });
            setSelectedWorkerId('');
            loadData();
        } catch (e) {
            alert('Ошибка при назначении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <LayoutGrid className="text-blue-500" /> Доска производства
                </h2>
                <button
                    onClick={loadData}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors border border-neutral-700"
                >
                    Обновить доску
                </button>
            </div>

            {loading ? (
                <div className="text-neutral-400 animate-pulse text-center py-10">Загрузка доски...</div>
            ) : batches.length === 0 ? (
                <div className="bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-lg">
                    <p className="text-neutral-400 text-lg">Нет активных партий в производстве</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {batches.map(batch => (
                        <div key={batch.id} className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
                            <div className="bg-neutral-900 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-700">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl flexitems-center gap-2 text-white font-mono font-bold">
                                            {batch.batchNumber}
                                        </h3>
                                        <span className="bg-blue-900/50 text-blue-400 border border-blue-800 px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wide">
                                            {batch.task.method.name}
                                        </span>
                                    </div>
                                    <div className="text-sm text-neutral-400">
                                        Заказ: <span className="text-neutral-300 font-mono">{batch.task.taskNumber}</span> |
                                        Деталь: <span className="text-neutral-300">{batch.task.nomenclature.name} ({batch.task.nomenclature.code})</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-1">Текущий этап</div>
                                    <div className="text-lg text-yellow-500 font-bold">{batch.currentStageLabel}</div>
                                </div>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <div className="flex items-stretch min-w-max gap-4">
                                    {batch.stages.map((stage, idx) => (
                                        <div key={stage.id} className="flex items-center">
                                            <div className={`w-48 p-4 rounded-lg border flex flex-col justify-between ${stage.status === 'DONE' ? 'bg-green-900/20 border-green-800/50' :
                                                stage.status === 'IN_PROGRESS' ? 'bg-yellow-900/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]' :
                                                    'bg-neutral-900/50 border-neutral-700/50 opacity-60'
                                                }`}>
                                                <div className="mb-4">
                                                    <div className="text-sm font-bold text-white mb-1">{stage.stageLabel}</div>
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${stage.status === 'DONE' ? 'text-green-500' :
                                                        stage.status === 'IN_PROGRESS' ? 'text-yellow-500' :
                                                            'text-neutral-500'
                                                        }`}>
                                                        {stage.status === 'DONE' ? 'Завершён' : stage.status === 'IN_PROGRESS' ? 'В работе' : 'Ожидает'}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="text-xs text-neutral-400">
                                                        <div className="text-neutral-500 mb-1">Исполнитель:</div>
                                                        {stage.worker ? (
                                                            <div className="text-neutral-200 truncate" title={stage.worker.fullName}>
                                                                {stage.worker.fullName}
                                                            </div>
                                                        ) : (
                                                            <div className="text-red-400 italic">Не назначен</div>
                                                        )}
                                                    </div>

                                                    {canAssign && (stage.status === 'PENDING' || stage.status === 'IN_PROGRESS') && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedWorkerId(stage.workerId ? String(stage.workerId) : '');
                                                                setAssignModal({ isOpen: true, stageId: stage.id });
                                                            }}
                                                            className="w-full text-xs bg-neutral-700 hover:bg-neutral-600 text-white py-1.5 rounded transition-colors flex items-center justify-center gap-1 mt-2"
                                                        >
                                                            <UserPlus size={14} /> Назначить
                                                        </button>
                                                    )}

                                                    {stage.status === 'DONE' && (
                                                        <div className="pt-2 border-t border-neutral-700/50 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-neutral-500">Вход:</span>
                                                                <span className="text-neutral-300 font-mono">{stage.qtyIn ?? '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-neutral-500">Годные:</span>
                                                                <span className="text-green-400 font-mono font-bold">{stage.qtyOut ?? '-'}</span>
                                                            </div>
                                                            {(stage.qtyRejected || 0) > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-neutral-500">Брак:</span>
                                                                    <span className="text-red-400 font-mono">{stage.qtyRejected}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {idx < batch.stages.length - 1 && (
                                                <div className="mx-2 text-neutral-600">
                                                    <ArrowRight size={20} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for assign worker */}
            {assignModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                            <UserPlus /> Назначить исполнителя
                        </h3>
                        <form onSubmit={handleAssign} className="space-y-4">
                            <div>
                                <label className="block text-neutral-400 mb-1 text-sm font-semibold">Сотрудник</label>
                                <select
                                    value={selectedWorkerId}
                                    onChange={e => setSelectedWorkerId(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">-- Не назначен --</option>
                                    {users.filter(u => u.role !== 'CLIENT').map(u => (
                                        <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setAssignModal({ isOpen: false, stageId: null })} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors shadow-md">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
