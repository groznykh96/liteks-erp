import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardCheck, MessageCircle, CheckCircle, Clock, X, SendHorizonal } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface Comment { id: number; text: string; createdAt: string; author: { fullName: string; role: string }; }
interface DTask {
    id: number;
    title: string;
    description: string;
    priority: number;
    status: string;
    createdAt: string;
    deadline?: string;
    createdBy: { fullName: string };
    assignedTo: { fullName: string; role: string; department?: string };
    comments: Comment[];
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
    1: { label: 'Обычный', color: 'text-neutral-400' },
    2: { label: 'Высокий', color: 'text-yellow-400' },
    3: { label: 'Срочный', color: 'text-red-400' },
};
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Новая', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
    IN_PROGRESS: { label: 'В работе', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' },
    DONE: { label: 'Выполнена', color: 'bg-green-900/40 text-green-300 border-green-700/50' },
    REJECTED: { label: 'Отклонена', color: 'bg-red-900/40 text-red-300 border-red-700/50' },
};

export default function MyDirectorTasks() {
    const { } = useAuth();
    const [tasks, setTasks] = useState<DTask[]>([]);
    const [selected, setSelected] = useState<DTask | null>(null);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const { showNotification, refreshCounts } = useNotifications();

    const load = async () => {
        setLoading(true);
        try {
            const t = await api.getDirectorTasks();
            setTasks(t);
            if (selected) {
                const updated = t.find((x: DTask) => x.id === selected.id);
                if (updated) setSelected(updated);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleStatusChange = async (taskId: number, status: string) => {
        try {
            await api.updateDirectorTask(taskId, { status });
            showNotification('Статус задачи обновлен', 'success');
            await load();
            await refreshCounts();
        } catch { showNotification('Ошибка смены статуса', 'error'); }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !selected) return;
        try {
            await api.addDirectorTaskComment(selected.id, commentText);
            setCommentText('');
            load();
        } catch { showNotification('Ошибка отправки сообщения', 'error'); }
    };

    const priColors = ['border-neutral-700', 'border-yellow-700/60', 'border-red-700/60'];

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardCheck className="text-purple-400" /> Мои задания от Руководителя
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Task list */}
                <div className="lg:col-span-2 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                    {loading && <div className="text-neutral-400 animate-pulse">Загрузка...</div>}
                    {!loading && tasks.length === 0 && (
                        <div className="text-neutral-500 text-center py-10">
                            <CheckCircle size={40} className="mx-auto mb-2 text-neutral-700" />
                            Нет активных заданий
                        </div>
                    )}
                    {tasks.map(t => {
                        const st = STATUS_LABEL[t.status] || STATUS_LABEL['NEW'];
                        const pr = PRIORITY_LABEL[t.priority] || PRIORITY_LABEL[1];
                        const isActive = selected?.id === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                className={`bg-neutral-800 border-l-4 ${priColors[t.priority - 1] || priColors[0]} rounded-xl p-4 cursor-pointer transition-all hover:bg-neutral-700/60
                                    ${isActive ? 'ring-2 ring-purple-500/50 bg-neutral-700/60' : ''}
                                    ${t.status === 'DONE' ? 'opacity-60' : ''}`}
                            >
                                <div className="font-bold text-white truncate">{t.title}</div>
                                <div className="text-sm text-neutral-400 mt-1 line-clamp-2">{t.description}</div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className={`text-xs font-bold ${pr.color}`}>{pr.label}</div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                                </div>
                                <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
                                    <span>от: {t.createdBy?.fullName}</span>
                                    <span className="flex items-center gap-1"><MessageCircle size={11} />{t.comments.length}</span>
                                </div>
                                {t.deadline && <div className="text-xs text-orange-400 mt-1">Срок: {new Date(t.deadline).toLocaleDateString('ru-RU')}</div>}
                            </div>
                        );
                    })}
                </div>

                {/* Task detail */}
                <div className="lg:col-span-3 bg-neutral-800 rounded-xl border border-neutral-700 p-5 max-h-[75vh] flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col gap-2">
                            <Clock size={40} className="text-neutral-700" />
                            Выберите задание для просмотра
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-lg font-bold text-white">{selected.title}</h3>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {selected.status !== 'DONE' && (
                                        <button
                                            onClick={() => handleStatusChange(selected.id, selected.status === 'NEW' ? 'IN_PROGRESS' : 'DONE')}
                                            className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            {selected.status === 'NEW' ? (
                                                <><Clock size={12} /> Взять в работу</>
                                            ) : (
                                                <><CheckCircle size={12} /> Выполнено</>
                                            )}
                                        </button>
                                    )}
                                    {selected.status !== 'REJECTED' && selected.status !== 'DONE' && (
                                        <button
                                            onClick={() => handleStatusChange(selected.id, 'REJECTED')}
                                            className="flex items-center gap-1 bg-neutral-700 hover:bg-red-800 text-red-300 px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <X size={12} /> Отклонить
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="text-xs text-neutral-500 mb-2">
                                <span>Поставил: {selected.createdBy?.fullName}</span>
                                {selected.deadline && <span className="ml-3 text-orange-400">Срок: {new Date(selected.deadline).toLocaleDateString('ru-RU')}</span>}
                            </div>

                            <div className="bg-neutral-900/60 rounded-lg p-3 mb-4 text-sm text-neutral-300 whitespace-pre-wrap border border-neutral-700">{selected.description}</div>

                            {/* Comments */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Переписка</div>
                                {selected.comments.length === 0 && <div className="text-neutral-600 text-sm">Ответов пока нет</div>}
                                {selected.comments.map(c => {
                                    const isDirector = c.author.role === 'DIRECTOR' || c.author.role === 'ADMIN';
                                    return (
                                        <div key={c.id} className={`flex gap-2 ${isDirector ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isDirector
                                                ? 'bg-indigo-900/30 text-indigo-100 border border-indigo-700/40'
                                                : 'bg-neutral-700 text-neutral-200 border border-neutral-600'}`}>
                                                <div className="font-bold text-xs mb-1">{c.author.fullName}</div>
                                                <div className="whitespace-pre-wrap">{c.text}</div>
                                                <div className="text-xs text-neutral-400 mt-1">{new Date(c.createdAt).toLocaleString('ru-RU')}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply */}
                            <div className="flex gap-2">
                                <textarea
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Написать ответ руководителю..."
                                    rows={2}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-sm resize-none outline-none focus:border-purple-500 transition-colors"
                                />
                                <button onClick={handleAddComment} className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold text-sm transition-colors self-end py-2 flex items-center gap-1">
                                    <SendHorizonal size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
