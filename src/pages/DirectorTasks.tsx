import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardCheck, Plus, MessageCircle, Trash2, CheckCircle, Clock, X } from 'lucide-react';

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
interface User { id: number; fullName: string; role: string; department?: string; }

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
    1: { label: 'Обычный', color: 'text-neutral-400' },
    2: { label: 'Высокий', color: 'text-yellow-400' },
    3: { label: 'Срочный', color: 'text-red-400' },
};
const STATUS_LABEL: Record<string, { label: string; color: string; icon: any }> = {
    NEW: { label: 'Новая', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50', icon: Clock },
    IN_PROGRESS: { label: 'В работе', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50', icon: Clock },
    DONE: { label: 'Выполнена', color: 'bg-green-900/40 text-green-300 border-green-700/50', icon: CheckCircle },
    REJECTED: { label: 'Отклонена', color: 'bg-red-900/40 text-red-300 border-red-700/50', icon: X },
};

export default function DirectorTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<DTask[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<DTask | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: '1', assignedToId: '', deadline: '' });
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [t, u] = await Promise.all([api.getDirectorTasks(), api.getUsers()]);
            setTasks(t);
            setUsers(u.filter((x: any) => x.role !== 'ADMIN'));
            // Update selected if it exists
            if (selected) {
                const updated = t.find((x: DTask) => x.id === selected.id);
                if (updated) setSelected(updated);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (user?.role !== 'DIRECTOR' && user?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-red-500 font-bold">Нет доступа</div>;
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.description || !form.assignedToId) return alert('Заполните все обязательные поля');
        try {
            await api.saveDirectorTask({ ...form, priority: Number(form.priority), assignedToId: Number(form.assignedToId) });
            setShowCreate(false);
            setForm({ title: '', description: '', priority: '1', assignedToId: '', deadline: '' });
            load();
        } catch { alert('Ошибка создания задачи'); }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !selected) return;
        try {
            await api.addDirectorTaskComment(selected.id, commentText);
            setCommentText('');
            load();
        } catch { alert('Ошибка отправки'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить задачу?')) return;
        await api.deleteDirectorTask(id);
        if (selected?.id === id) setSelected(null);
        load();
    };

    const priColors = ['border-neutral-700', 'border-yellow-700/60', 'border-red-700/60'];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ClipboardCheck className="text-blue-500" /> Задачи от Руководителя
                </h2>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg transition-colors">
                    <Plus size={18} /> Создать задачу
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Task list */}
                <div className="lg:col-span-2 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                    {loading && <div className="text-neutral-400 animate-pulse">Загрузка...</div>}
                    {!loading && tasks.length === 0 && <div className="text-neutral-500 text-center py-8">Задач пока нет</div>}
                    {tasks.map(t => {
                        const st = STATUS_LABEL[t.status] || STATUS_LABEL['NEW'];
                        const pr = PRIORITY_LABEL[t.priority] || PRIORITY_LABEL[1];
                        const isActive = selected?.id === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                className={`bg-neutral-800 border-l-4 ${priColors[t.priority - 1] || priColors[0]} rounded-xl p-4 cursor-pointer transition-all hover:bg-neutral-700/60
                                    ${isActive ? 'ring-2 ring-blue-500/50 bg-neutral-700/60' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="font-bold text-white truncate">{t.title}</div>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }} className="text-neutral-500 hover:text-red-400 flex-shrink-0 transition-colors"><Trash2 size={14} /></button>
                                </div>
                                <div className="text-sm text-neutral-400 mt-1 line-clamp-2">{t.description}</div>
                                <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                                    <div className={`text-xs font-bold ${pr.color}`}>{pr.label}</div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                                </div>
                                <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
                                    <span>→ {t.assignedTo?.fullName}</span>
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
                        <div className="flex-1 flex items-center justify-center text-neutral-500">Выберите задачу для просмотра</div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between mb-1">
                                <h3 className="text-xl font-bold text-white">{selected.title}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${(STATUS_LABEL[selected.status] || STATUS_LABEL['NEW']).color}`}>
                                    {(STATUS_LABEL[selected.status] || STATUS_LABEL['NEW']).label}
                                </span>
                            </div>
                            <div className="text-sm text-neutral-400 mb-1">
                                Исполнитель: <span className="text-white font-medium">{selected.assignedTo?.fullName}</span>
                                {selected.assignedTo?.department && <span className="text-neutral-500"> ({selected.assignedTo.department})</span>}
                            </div>
                            {selected.deadline && <div className="text-xs text-orange-400 mb-2">Срок: {new Date(selected.deadline).toLocaleDateString('ru-RU')}</div>}

                            <div className="bg-neutral-900/60 rounded-lg p-3 mb-4 text-sm text-neutral-300 whitespace-pre-wrap border border-neutral-700">{selected.description}</div>

                            {/* Comments */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Переписка</div>
                                {selected.comments.length === 0 && <div className="text-neutral-600 text-sm">Ответов пока нет</div>}
                                {selected.comments.map(c => {
                                    const isDirector = c.author.role === 'DIRECTOR' || c.author.role === 'ADMIN';
                                    return (
                                        <div key={c.id} className={`flex gap-2 ${isDirector ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isDirector
                                                ? 'bg-blue-700/30 text-blue-100 border border-blue-700/40'
                                                : 'bg-neutral-700 text-neutral-200 border border-neutral-600'}`}>
                                                <div className="font-bold text-xs mb-1">{c.author.fullName}</div>
                                                <div className="whitespace-pre-wrap">{c.text}</div>
                                                <div className="text-xs text-neutral-400 mt-1">{new Date(c.createdAt).toLocaleString('ru-RU')}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply input */}
                            <div className="flex gap-2">
                                <textarea
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Написать сообщение..."
                                    rows={2}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-sm resize-none outline-none focus:border-blue-500 transition-colors"
                                />
                                <button onClick={handleAddComment} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-bold text-sm transition-colors self-end py-2">
                                    Отправить
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Создать задачу</h3>
                            <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Заголовок задачи *</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Описание задачи (в свободной форме) *</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={5} required
                                    placeholder="Опишите задачу подробно: что нужно сделать, какой результат ожидается, требования..."
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Исполнитель *</label>
                                    <select value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500" required>
                                        <option value="">Выбрать...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName} ({u.role}{u.department ? `, ${u.department}` : ''})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Приоритет</label>
                                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500">
                                        <option value="1">Обычный</option>
                                        <option value="2">Высокий</option>
                                        <option value="3">Срочный</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Срок выполнения (необязательно)</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors">Создать задачу</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
