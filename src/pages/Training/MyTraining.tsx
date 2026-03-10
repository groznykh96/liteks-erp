import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { BookOpen, Clock, Library, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface TrainingAssignment {
    id: number;
    status: string;
    readAt: string | null;
    createdAt: string;
    material: {
        id: number;
        title: string;
        description: string;
        fileUrl: string;
        testUrl?: string | null;
    };
}

interface MaterialItem {
    id: number;
    title: string;
    description?: string | null;
    fileUrl: string;
    testUrl?: string | null;
    departments?: string | null;
    createdAt: string;
}

export default function MyTraining() {
    const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
    const [registry, setRegistry] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'my' | 'registry'>('my');
    const { showNotification, confirm, refreshCounts } = useNotifications();

    const load = async () => {
        setLoading(true);
        try {
            const [assignData, regData] = await Promise.all([
                api.getMyTraining().catch(() => []),
                api.getRelevantTrainingMaterials().catch(() => []),
            ]);
            setAssignments(assignData || []);
            setRegistry(regData || []);
        } catch (error) {
            console.error('Error loading training data:', error);
            showNotification('Ошибка при загрузке данных', 'error');
        } finally {
            setLoading(false);
        }
    };

    const mergedRegistry = useMemo(() => {
        const base = [...registry];
        const completed = assignments
            .filter(a => a.status === 'READ')
            .map(a => ({
                ...a.material,
                isCompletedAssignment: true,
                readAt: a.readAt
            }));

        completed.forEach(cm => {
            if (!base.find(m => m.id === cm.id)) {
                base.push(cm as any);
            }
        });

        return base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [registry, assignments]);

    useEffect(() => { load(); }, []);

    const handleRead = async (assignmentId: number) => {
        if (!await confirm({ message: 'Подтверждаете, что вы ознакомились с данным материалом?', type: 'info' })) return;
        try {
            await api.markTrainingAsRead(assignmentId);
            showNotification('Статус обновлен', 'success');
            await load();
            await refreshCounts();
        } catch {
            showNotification('Ошибка при сохранении статуса', 'error');
        }
    };

    if (loading) {
        return <div className="text-neutral-400 p-6 animate-pulse">Загрузка материалов...</div>;
    }

    const pendingAssignments = assignments.filter(a => a.status !== 'READ');
    const pendingCount = pendingAssignments.length;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="text-blue-500" /> Обучение и инструкции
            </h2>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setTab('my')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'my' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                    <BookOpen size={16} />
                    Мои задания
                    {pendingCount > 0 && (
                        <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                    )}
                </button>
                <button
                    onClick={() => setTab('registry')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'registry' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                    <Library size={16} />
                    Реестр материалов
                    {mergedRegistry.length > 0 && (
                        <span className="bg-neutral-600 text-white text-xs px-1.5 py-0.5 rounded-full">{mergedRegistry.length}</span>
                    )}
                </button>
            </div>

            {/* Tab: My assignments */}
            {tab === 'my' && (
                <div className="space-y-4">
                    {pendingAssignments.length === 0 ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                            На данный момент у вас нет невыполненных заданий.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingAssignments.map(a => (
                                <div key={a.id} className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">{a.material.title}</h3>
                                        {a.material.description && (
                                            <p className="text-sm text-neutral-400 mb-3">{a.material.description}</p>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-neutral-700 space-y-3">
                                        <a
                                            href={a.material.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                                        >
                                            <ExternalLink size={14} /> Открыть материал
                                        </a>

                                        {a.material.testUrl && (
                                            <a
                                                href={a.material.testUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors"
                                            >
                                                <ExternalLink size={14} /> Пройти тестирование
                                            </a>
                                        )}

                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={() => handleRead(a.id)}
                                                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors"
                                            >
                                                <Clock size={16} /> Подтвердить ознакомление
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Registry */}
            {tab === 'registry' && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-500">
                        Все учебные материалы, соответствующие вашей должности, и завершенные вами курсы.
                    </p>
                    {mergedRegistry.length === 0 ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                            <Library size={48} className="mx-auto mb-3 opacity-20" />
                            Для вашей должности/отдела материалов пока нет.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mergedRegistry.map(m => {
                                const ass = assignments.find(a => a.material.id === m.id && a.status === 'READ');
                                return (
                                    <div key={m.id} className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-bold text-white">{m.title}</h3>
                                                {ass && (
                                                    <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded font-bold">ОСВОЕНО</span>
                                                )}
                                            </div>
                                            {m.description && (
                                                <p className="text-sm text-neutral-400 mb-2">{m.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-2 text-xs">
                                                {m.departments && m.departments.startsWith('[') ? JSON.parse(m.departments).map((d: string) => (
                                                    <span key={d} className="bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded">{d}</span>
                                                )) : null}
                                                {ass && (
                                                    <span className="text-neutral-500 text-[10px] mt-1 italic w-full">
                                                        Завершено: {new Date(ass.readAt!).toLocaleDateString('ru-RU')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-neutral-700 space-y-2">
                                            <a
                                                href={m.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                                            >
                                                <ExternalLink size={14} /> Открыть материал
                                            </a>
                                            {m.testUrl && (
                                                <a
                                                    href={m.testUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors"
                                                >
                                                    <ExternalLink size={14} /> Пройти тестирование
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
