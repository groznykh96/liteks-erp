import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Hammer, CheckCircle, Package, ArrowRight, Play, CheckSquare } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface Nomenclature { code: string; name: string; }
interface CastingMethod { name: string; }
interface QCReport {
    id: number;
    acceptedQty: number;
    rejectedQty: number;
    comment?: string;
    photos?: { photoUrl: string }[];
}
interface Batch {
    id: number;
    batchNumber: string;
    completedQuantity: number;
    meltsCount?: number;
    pouringTemp?: number;
    moldTemp?: number;
    createdAt: string;
    task: Task;
    qcReports: QCReport[];
}

interface Task {
    id: number;
    taskNumber: string;
    nomenclature: Nomenclature;
    method: CastingMethod;
    quantity: number;
    status: string;
    createdAt: string;
    notes?: string;
}

interface Stage {
    id: number;
    stage: string;
    stageLabel: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
    qtyIn: number | null;
    qtyOut?: number | null;
    qtyRejected?: number | null;
    batch: {
        id: number;
        batchNumber: string;
        route?: string;
        currentStage?: string;
        stages?: {
            id: number;
            stage: string;
            stageLabel?: string;
            status: string;
            qtyIn: number | null;
            qtyOut: number | null;
            qtyRejected: number | null;
            worker?: { fullName: string } | null;
        }[];
        task: {
            taskNumber: string;
            nomenclature: Nomenclature;
            method: CastingMethod;
        }
    };
    nextStageLabel: string | null;
}

export default function WorkerDashboard() {
    const { user } = useAuth();
    const { showNotification } = useNotifications();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);

    // Batch Reporting State
    const [reportTaskId, setReportTaskId] = useState<number | null>(null);
    const [completedQuantity, setCompletedQuantity] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [meltsCount, setMeltsCount] = useState('1');
    const [pouringTemp, setPouringTemp] = useState('');
    const [moldTemp, setMoldTemp] = useState('');

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [tasksData, batchesData, stagesData] = await Promise.all([
                api.getTasks({ assignedToUserId: user.id }),
                api.getBatches({ workerId: user.id }),
                api.getMyStages()
            ]);
            setTasks(tasksData);
            setBatches(batchesData);
            setStages(stagesData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        try {
            await api.updateTask(taskId, { status: newStatus });
            loadData();
        } catch (e) {
            showNotification('Ошибка при изменении статуса', 'error');
        }
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportTaskId) return;

        const task = tasks.find(t => t.id === reportTaskId);
        if (!task) return;

        const isHTS = task.method.name.toUpperCase().includes('ХТС');
        const isMLPD = task.method.name.toUpperCase().includes('МЛПД');
        const route = isHTS ? 'HTS' : isMLPD ? 'MLPD' : 'KOKIL';

        try {
            // Create Batch
            await api.saveBatch({
                taskId: reportTaskId,
                batchNumber: isHTS ? '' : batchNumber,
                completedQuantity: Number(completedQuantity),
                meltsCount: Number(meltsCount),
                pouringTemp: pouringTemp ? Number(pouringTemp) : undefined,
                moldTemp: moldTemp ? Number(moldTemp) : undefined,
                route
            });

            // Mark Task as Done (optional based on quantity logic, but assuming simple flow here)
            await api.updateTask(reportTaskId, { status: 'DONE' });

            setReportTaskId(null);
            setBatchNumber('');
            setCompletedQuantity('');
            setMeltsCount('1');
            setPouringTemp('');
            setMoldTemp('');
            loadData();
            showNotification('Партия успешно создана и передана на первый этап', 'success');
        } catch (e: any) {
            if (e.response && e.response.status === 409) {
                showNotification(e.response.data.error || 'Партия с таким номером уже существует!', 'error');
            } else {
                showNotification('Ошибка при сохранении партии', 'error');
            }
        }
    };

    // Stage Tracking State
    const [stageReportModal, setStageReportModal] = useState<{ isOpen: boolean; stage: Stage | null }>({ isOpen: false, stage: null });
    const [stageQtyOut, setStageQtyOut] = useState('');
    const [stageQtyRejected, setStageQtyRejected] = useState('0');
    const [stageNote, setStageNote] = useState('');
    const [stageNewBatchNumber, setStageNewBatchNumber] = useState('');

    const handleStartStage = async (stageId: number) => {
        try {
            await api.startStage(stageId);
            loadData();
        } catch (e) {
            showNotification('Ошибка при начале этапа', 'error');
        }
    };

    const handleCompleteStageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stageReportModal.stage) return;

        try {
            const isHtsPouring = stageReportModal.stage.stage === 'POURING' && stageReportModal.stage.batch.route === 'HTS';
            if (isHtsPouring && !stageNewBatchNumber) {
                showNotification('Укажите номер партии для дальнейшего следования!', 'warning');
                return;
            }

            await api.completeStage(stageReportModal.stage.id, {
                qtyOut: Number(stageQtyOut),
                qtyRejected: Number(stageQtyRejected),
                note: stageNote,
                newBatchNumber: isHtsPouring ? stageNewBatchNumber : undefined
            });
            setStageReportModal({ isOpen: false, stage: null });
            setStageQtyOut('');
            setStageQtyRejected('0');
            setStageNote('');
            setStageNewBatchNumber('');
            loadData();
            showNotification('Этап успешно завершен', 'success');
        } catch (e: any) {
            if (e.response && e.response.status === 409) {
                showNotification(e.response.data.error || 'Партия с таким номером уже существует!', 'error');
            } else {
                showNotification('Ошибка при завершении этапа', 'error');
            }
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Hammer className="text-orange-500" /> Мои Задачи: {user.department ? `Цех ${user.department}` : ''}
            </h2>

            {/* Instruction Panel */}
            {user.department && (
                <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <h3 className="text-blue-400 font-bold mb-1">Инструкция по ТБ и процессу (Направление: {user.department})</h3>
                        <p className="text-sm text-blue-200/70">Ознакомьтесь с нормативами перед началом смены.</p>
                    </div>
                    <a href="#/instructions" className="bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors">
                        Открыть инструкцию
                    </a>
                </div>
            )}

            {/* ПРОИЗВОДСТВЕННЫЕ ЭТАПЫ (НОВОЕ) */}
            <h3 className="text-xl font-bold mt-8 border-b border-neutral-700 pb-2 text-blue-400">Мои производственные этапы</h3>

            {/* BATCH PROGRESS TRACKER */}
            {stages.length > 0 && (
                <div className="space-y-3 mt-4">
                    {Array.from(new Set(stages.map(s => s.batch.id))).map(batchId => {
                        const batchStage = stages.find(s => s.batch.id === batchId);
                        if (!batchStage) return null;
                        const allStages = batchStage.batch.stages || [];
                        return (
                            <div key={batchId} className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="font-mono font-bold text-neutral-200">{batchStage.batch.batchNumber}</span>
                                        <span className="text-xs text-neutral-500 ml-2">{batchStage.batch.task.nomenclature.code} — {batchStage.batch.task.nomenclature.name}</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40">{batchStage.batch.task.method.name}</span>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    {allStages.map(st => (
                                        <div key={st.id} className={`flex-1 min-w-[60px] text-center px-1 py-2 rounded text-[9px] font-bold uppercase tracking-wide border transition-all
                                            ${st.status === 'DONE' ? 'bg-green-900/30 text-green-400 border-green-700/50' : st.status === 'IN_PROGRESS' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50 animate-pulse' : 'bg-neutral-900 text-neutral-500 border-neutral-700/40'}`}>
                                            <div>{st.stageLabel || st.stage}</div>
                                            {st.status === 'DONE' && <div className="mt-1 text-[8px] text-neutral-400">{st.qtyOut ?? '-'} шт {st.qtyRejected ? `(брак: ${st.qtyRejected})` : ''}</div>}
                                            {st.status === 'IN_PROGRESS' && <div className="mt-1 text-[8px] text-blue-300">▶ В работе</div>}
                                            {st.worker && st.status === 'DONE' && <div className="text-[7px] text-neutral-500 mt-0.5">{st.worker.fullName.split(' ')[0]}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {loading ? (
                <div className="text-neutral-400 animate-pulse">Загрузка этапов...</div>
            ) : stages.length === 0 ? (
                <div className="bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-lg">
                    <p className="text-neutral-400 text-lg">Нет активных этапов производства</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stages.map(s => (
                        <div key={s.id} className={`p-5 rounded-xl border shadow-lg transition-all ${s.status === 'IN_PROGRESS' ? 'bg-blue-900/20 border-blue-800/50 outline outline-1 outline-blue-500/50' : 'bg-neutral-800 border-neutral-700'
                            }`}>
                            <div className="flex justify-between items-start mb-4 border-b border-neutral-700/50 pb-3">
                                <div>
                                    <div className="font-mono text-sm font-bold text-neutral-300">Партия: {s.batch.batchNumber}</div>
                                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-1">{s.stageLabel}</div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border
                                    ${s.status === 'IN_PROGRESS' ? 'bg-blue-900/50 text-blue-400 border-blue-700' : 'bg-neutral-900 text-neutral-300 border-neutral-600'}`}>
                                    {s.status === 'IN_PROGRESS' ? 'В Работе' : 'Ожидает'}
                                </div>
                            </div>

                            <div className="mb-6 space-y-2">
                                <div className="flex items-center gap-2 font-bold text-lg">
                                    <Package size={18} className="text-yellow-500" /> {s.batch.task.nomenclature.code}
                                </div>
                                <div className="text-sm text-neutral-400">{s.batch.task.nomenclature.name}</div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700/50">
                                    <div className="inline-block px-2 py-1 rounded text-xs font-bold bg-neutral-900 text-neutral-400 border border-neutral-700/50">
                                        Входное кол-во:
                                    </div>
                                    <div className="font-mono font-bold text-xl text-white">
                                        {s.qtyIn ?? '-'} <span className="text-sm font-normal text-neutral-500 font-sans">шт</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                {s.status === 'PENDING' && (
                                    <button onClick={() => handleStartStage(s.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md flex items-center justify-center gap-2">
                                        <Play size={16} /> Начать работу
                                    </button>
                                )}
                                {s.status === 'IN_PROGRESS' && (
                                    <button onClick={() => {
                                        setStageReportModal({ isOpen: true, stage: s });
                                        setStageQtyOut(s.qtyIn ? s.qtyIn.toString() : '');
                                        setStageNewBatchNumber('');
                                    }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md flex items-center justify-center gap-2">
                                        <CheckSquare size={16} /> Завершить этап
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h3 className="text-xl font-bold mt-8 border-b border-neutral-700 pb-2">Создание партии (Устаревшее/Первый этап)</h3>

            {loading ? (
                <div className="text-neutral-400 animate-pulse">Загрузка задач...</div>
            ) : tasks.length === 0 ? (
                <div className="bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-lg">
                    <p className="text-neutral-400 text-lg">Нет назначенных задач</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(t => (
                        <div key={t.id} className={`p-5 rounded-xl border shadow-lg transition-all ${t.status === 'DONE' ? 'bg-green-900/10 border-green-800/50' : t.status === 'IN_PROGRESS' ? 'bg-yellow-900/10 border-yellow-800/50' : 'bg-neutral-800 border-neutral-700'}`}>
                            <div className="flex justify-between items-start mb-4 border-b border-neutral-700/50 pb-3">
                                <div>
                                    <div className="font-mono text-sm font-bold text-neutral-300">{t.taskNumber}</div>
                                    <div className="text-xs text-neutral-500">{new Date(t.createdAt).toLocaleDateString()}</div>
                                    {t.notes && t.notes.includes('Приоритет') && (
                                        <div className={`text-[10px] font-bold uppercase mt-1 ${t.notes.includes('3') ? 'text-red-400' : t.notes.includes('2') ? 'text-yellow-400' : 'text-neutral-500'}`}>
                                            {t.notes.includes('3') ? 'СРОЧНО' : t.notes.includes('2') ? 'ВЫСОКИЙ' : 'ОБЫЧНЫЙ'} ПРИОРИТЕТ
                                        </div>
                                    )}
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border
                                    ${t.status === 'DONE' ? 'bg-green-900/50 text-green-400 border-green-700' :
                                        t.status === 'IN_PROGRESS' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700' :
                                            'bg-neutral-900 text-neutral-300 border-neutral-600'}
                                `}>
                                    {t.status === 'ASSIGNED' ? 'Новая' : t.status === 'IN_PROGRESS' ? 'В Работе' : 'Готово'}
                                </div>
                            </div>

                            <div className="mb-6 space-y-2">
                                <div className="flex items-center gap-2 font-bold text-lg"><Package size={18} className="text-blue-400" /> {t.nomenclature.code}</div>
                                <div className="text-sm text-neutral-400">{t.nomenclature.name}</div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700/50">
                                    <div className="inline-block px-2 py-1 rounded text-xs font-bold bg-purple-900/50 text-purple-200 border border-purple-700/50 uppercase">{t.method.name}</div>
                                    <div className="font-mono font-bold text-2xl text-white">
                                        <span className="text-neutral-400 text-xs mr-2 font-sans">План:</span>
                                        {t.quantity} <span className="text-sm font-normal text-neutral-500 font-sans">шт</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                {t.status === 'ASSIGNED' && (
                                    <button onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md">
                                        Начать работу
                                    </button>
                                )}
                                {t.status === 'IN_PROGRESS' && (
                                    <button onClick={() => {
                                        setReportTaskId(t.id);
                                        setCompletedQuantity(t.quantity.toString());
                                    }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> Создать партию и передать дальше
                                    </button>
                                )}
                                {t.status === 'DONE' && (
                                    <div className="w-full text-center py-2.5 text-green-500 font-bold border border-green-800/30 rounded flex items-center justify-center gap-2 bg-green-900/20">
                                        <CheckCircle size={16} /> На контроле ОТК
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h3 className="text-xl font-bold mt-8 border-b border-neutral-700 pb-2">Статистика и приемка ОТК (Мои партии)</h3>

            {loading ? (
                <div className="text-neutral-400 animate-pulse">Загрузка истории...</div>
            ) : batches.length === 0 ? (
                <div className="text-neutral-500 italic">У вас пока нет закрытых партий.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-neutral-900 border-b border-neutral-700 text-neutral-400">
                                <th className="p-3">Партия</th>
                                <th className="p-3">Дата</th>
                                <th className="p-3">Деталь</th>
                                <th className="p-3">Сдано фактом</th>
                                <th className="p-3 hidden md:table-cell">Параметры</th>
                                <th className="p-3">Статус ОТК</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map(b => {
                                const qc = b.qcReports?.[0]; // Assuming latest QC report or first
                                const isInspected = !!qc;

                                return (
                                    <tr key={b.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                        <td className="p-3 font-mono font-bold text-neutral-300">{b.batchNumber}</td>
                                        <td className="p-3 text-neutral-500">{new Date(b.createdAt).toLocaleString()}</td>
                                        <td className="p-3 bg-neutral-900/40">
                                            {b.task?.nomenclature?.name} <span className="text-xs text-neutral-500">[{b.task?.nomenclature?.code}]</span>
                                        </td>
                                        <td className="p-3 font-bold text-white">
                                            {b.completedQuantity} шт
                                        </td>
                                        <td className="p-3 hidden md:table-cell text-xs text-neutral-400">
                                            <div>Плавок: <span className="text-white">{b.meltsCount || 1}</span></div>
                                            {b.pouringTemp && <div>Tзалив: {b.pouringTemp}°C</div>}
                                            {b.moldTemp && <div>Tформ: {b.moldTemp}°C</div>}
                                        </td>
                                        <td className="p-3">
                                            {!isInspected ? (
                                                <span className="text-yellow-500 font-bold bg-yellow-900/20 px-2 py-1 rounded">Ожидает проверки</span>
                                            ) : (
                                                <div className="text-xs space-y-1">
                                                    <div className="text-green-400 font-bold">Принято: {qc.acceptedQty}</div>
                                                    {qc.rejectedQty > 0 && <div className="text-red-400 font-bold">Брак: {qc.rejectedQty}</div>}
                                                    {qc.comment && <div className="text-neutral-400 italic">«{qc.comment}»</div>}
                                                    {qc.photos && qc.photos.length > 0 && (
                                                        <div className="mt-1 pt-1 border-t border-neutral-700/50">
                                                            <div className="text-xs text-neutral-500 mb-1">Фотографии брака:</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {qc.photos.map((photo, pIdx) => (
                                                                    <a
                                                                        key={pIdx}
                                                                        href={photo.photoUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                                                    >
                                                                        🖼️ Фото {pIdx + 1}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* МOДАЛКА ЗАВЕРШЕНИЯ (СОЗДАНИЕ ПАРТИИ) */}
            {reportTaskId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                            <ArrowRight /> Отчет о выполнении
                        </h3>
                        <form onSubmit={handleReportSubmit} className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Кол-во изделий, шт</label>
                                    <input type="number" min="1" value={completedQuantity} onChange={e => setCompletedQuantity(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg" />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Сделано плавок</label>
                                    <input type="number" min="1" value={meltsCount} onChange={e => setMeltsCount(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">TЗаливки, °C</label>
                                    <input type="number" step="1" value={pouringTemp} onChange={e => setPouringTemp(e.target.value)} placeholder="Без замера"
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg" />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">TФормы, °C</label>
                                    <input type="number" step="1" value={moldTemp} onChange={e => setMoldTemp(e.target.value)} placeholder="Без замера"
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg" />
                                </div>
                            </div>
                            {reportTaskId && tasks.find(t => t.id === reportTaskId)?.method.name.toUpperCase().includes('ХТС') ? (
                                <div>
                                    <div className="p-3 bg-blue-900/20 border border-blue-800 rounded text-blue-300 text-[11px] leading-relaxed">
                                        <strong className="block mb-1 text-blue-400">Формовка (ХТС):</strong>
                                        Вы создаёте заготовки. Номер партии будет присвоен заливщиком. Просто укажите количество заготовок.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Уникальный Номер Партии</label>
                                    <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} required placeholder="Напр: ХТС-24-100"
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg uppercase" />
                                    <p className="text-[10px] text-neutral-500 mt-1">ОТК будет принимать детали по этому номеру.</p>
                                </div>
                            )}
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setReportTaskId(null)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors shadow-md">Сдать партию</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* МOДАЛКА ЗАВЕРШЕНИЯ ЭТАПА */}
            {stageReportModal.isOpen && stageReportModal.stage && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-green-400">
                            <CheckSquare /> Отчет по этапу
                        </h3>
                        <p className="text-sm text-neutral-400 mb-4 border-b border-neutral-700 pb-2">
                            {stageReportModal.stage.stageLabel} (Партия: {stageReportModal.stage.batch.batchNumber})
                        </p>

                        <form onSubmit={handleCompleteStageSubmit} className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Годные, шт</label>
                                    <input type="number" min="0" max={stageReportModal.stage.qtyIn ?? undefined} value={stageQtyOut} onChange={e => setStageQtyOut(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-green-400 font-bold outline-none focus:border-green-500 transition-colors font-mono text-lg" />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Брак, шт</label>
                                    <input type="number" min="0" value={stageQtyRejected} onChange={e => setStageQtyRejected(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-red-400 font-bold outline-none focus:border-red-500 transition-colors font-mono text-lg" />
                                </div>
                            </div>

                            {stageReportModal.stage.nextStageLabel && (
                                <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-900/50 mt-2">
                                    Следующий этап: <strong>{stageReportModal.stage.nextStageLabel}</strong> (детали будут переданы туда)
                                </div>
                            )}

                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider">Комментарий / Причина брака</label>
                                <input type="text" value={stageNote} onChange={e => setStageNote(e.target.value)} placeholder="Опционально..."
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>

                            {stageReportModal.stage.stage === 'POURING' && stageReportModal.stage.batch.route === 'HTS' && (
                                <div className="mt-4 pt-4 border-t border-neutral-700">
                                    <label className="block text-neutral-400 mb-1 font-semibold uppercase text-xs tracking-wider text-green-400">Присвоить Партию (Для ОТК)</label>
                                    <input type="text" value={stageNewBatchNumber} onChange={e => setStageNewBatchNumber(e.target.value)} required placeholder="Напр: ХТС-24-100"
                                        className="w-full bg-neutral-900 border border-green-700/50 rounded p-2 text-white outline-none focus:border-green-500 transition-colors font-mono text-lg uppercase" />
                                    <p className="text-[10px] text-neutral-500 mt-1">Укажите постоянный номер партии, по которому деталь пойдет дальше.</p>
                                </div>
                            )}
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setStageReportModal({ isOpen: false, stage: null })} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors shadow-md">Завершить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
