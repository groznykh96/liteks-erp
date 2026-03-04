import { useState, useEffect } from 'react';
import { api } from '../../api';
import { CheckCircle, BookOpen, Clock, Library, ExternalLink } from 'lucide-react';

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

    const load = async () => {
        setLoading(true);
        try {
            const [assignData, regData] = await Promise.all([
                api.getMyTraining(),
                api.getRelevantTrainingMaterials().catch(() => []),
            ]);
            setAssignments(assignData);
            setRegistry(regData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleRead = async (assignmentId: number) => {
        if (!confirm('Подтверждаете, что вы ознакомились с данным материалом?')) return;
        try {
            await api.markTrainingAsRead(assignmentId);
            load();
        } catch {
            alert('Ошибка при сохранении статуса');
        }
    };

    if (loading) {
        return <div className="text-neutral-400 p-6 animate-pulse">Загрузка материалов...</div>;
    }

    const pendingCount = assignments.filter(a => a.status !== 'READ').length;

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
                    {registry.length > 0 && (
                        <span className="bg-neutral-600 text-white text-xs px-1.5 py-0.5 rounded-full">{registry.length}</span>
                    )}
                </button>
            </div>

            {/* ─── Tab: My assignments ─── */}
            {tab === 'my' && (
                <>
                    {assignments.length === 0 ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                            На данный момент вам не назначено никаких обучающих материалов.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assignments.map(a => {
                                const isRead = a.status === 'READ';
                                const mat = a.material;
                                return (
                                    <div key={a.id} className={`bg-neutral-800 border rounded-xl p-5 flex flex-col ${isRead ? 'border-green-700/50' : 'border-neutral-700'}`}>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-2">{mat.title}</h3>
                                            {mat.description && (
                                                <p className="text-sm text-neutral-400 mb-3">{mat.description}</p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-neutral-700 space-y-3">
                                            <a
                                                href={mat.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                                            >
                                                <ExternalLink size={14} /> Открыть материал
                                            </a>

                                            {mat.testUrl && (
                                                <a
                                                    href={mat.testUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors"
                                                >
                                                    <ExternalLink size={14} /> Пройти тестирование
                                                </a>
                                            )}

                                            <div className="flex items-center justify-end">
                                                {isRead ? (
                                                    <span className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-2 py-1 rounded">
                                                        <CheckCircle size={16} /> Ознакомлен
                                                        <span className="text-xs font-normal opacity-80 ml-1">
                                                            {new Date(a.readAt!).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRead(a.id)}
                                                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors"
                                                    >
                                                        <Clock size={16} /> Подтвердить ознакомление
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ─── Tab: Registry (role/dept filtered) ─── */}
            {tab === 'registry' && (
                <>
                    <p className="text-sm text-neutral-500">
                        Все учебные материалы, соответствующие вашей должности и отделу.
                    </p>
                    {registry.length === 0 ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                            <Library size={48} className="mx-auto mb-3 opacity-20" />
                            Для вашей должности/отдела материалов пока нет.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {registry.map(m => (
                                <div key={m.id} className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">{m.title}</h3>
                                        {m.description && (
                                            <p className="text-sm text-neutral-400 mb-2">{m.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2 text-xs">
                                            {m.departments ? JSON.parse(m.departments).map((d: string) => (
                                                <span key={d} className="bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded">{d}</span>
                                            )) : null}
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
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
