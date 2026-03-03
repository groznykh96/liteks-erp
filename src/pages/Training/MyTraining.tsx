import { useState, useEffect } from 'react';
import { api } from '../../api';
import { CheckCircle, BookOpen, Clock } from 'lucide-react';

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
    };
}

export default function MyTraining() {
    const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            // Need to add this to api.ts -> getMyTraining
            const data = await api.getMyTraining();
            setAssignments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleRead = async (assignmentId: number) => {
        if (!confirm('Подтверждаете, что вы ознакомились с данным материалом?')) return;
        try {
            await api.markTrainingAsRead(assignmentId);
            load();
        } catch (e) {
            alert('Ошибка при сохранении статуса');
        }
    };

    if (loading) {
        return <div className="text-neutral-400 p-6 animate-pulse">Загрузка материалов...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="text-blue-500" /> Мое обучение и инструкции
            </h2>

            {assignments.length === 0 && (
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                    <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                    На данный момент вам не назначено никаких обучающих материалов.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map(a => {
                    const isRead = a.status === 'READ';
                    return (
                        <div key={a.id} className={`bg-neutral-800 border rounded-xl p-5 flex flex-col ${isRead ? 'border-green-700/50' : 'border-neutral-700'}`}>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2">{a.material.title}</h3>
                                {a.material.description && (
                                    <p className="text-sm text-neutral-400 mb-4">{a.material.description}</p>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-neutral-700 flex items-center justify-between">
                                <a
                                    href={a.material.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                                >
                                    Открыть материал
                                </a>

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
                    );
                })}
            </div>
        </div>
    );
}
