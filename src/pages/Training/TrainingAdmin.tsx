import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, Plus, Users, BookOpen, AlertTriangle } from 'lucide-react';

interface TrainingAssignment {
    id: number;
    status: string;
    readAt: string | null;
    user: { id: number; fullName: string; department: string | null };
}

interface TrainingMaterial {
    id: number;
    title: string;
    description: string;
    fileUrl: string;
    departments: string | null;
    createdAt: string;
    assignments: TrainingAssignment[];
}

const DEPARTMENTS = [
    'Формовочный участок',
    'Плавильный участок',
    'Обрубной участок',
    'Участок ХТС',
    'Служба качества (ОТК)',
    'Складской комплекс',
    'Администрация',
    'Отдел продаж',
    'Инженерно-технологический отдел'
];

export default function TrainingAdmin() {
    const { user } = useAuth();
    const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.getTrainingMaterials();
            setMaterials(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleDep = (dep: string) => {
        if (selectedDeps.includes(dep)) {
            setSelectedDeps(selectedDeps.filter(d => d !== dep));
        } else {
            setSelectedDeps([...selectedDeps, dep]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createTrainingMaterial({
                title,
                description,
                fileUrl,
                departments: selectedDeps
            });
            setShowCreate(false);
            setTitle('');
            setDescription('');
            setFileUrl('');
            setSelectedDeps([]);
            load();
        } catch (e) {
            alert('Ошибка при создании материала');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Точно удалить этот материал? Все назначения будут потеряны.')) return;
        try {
            await api.deleteTrainingMaterial(id);
            load();
        } catch (e) {
            alert('Ошибка при удалении');
        }
    };

    if (user?.role !== 'ADMIN' && user?.role !== 'DIRECTOR') {
        return <div className="p-4 text-red-500">Доступ запрещен. Требуются права Администратора.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="text-orange-500" /> Управление обучением
                </h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                >
                    <Plus size={18} /> Добавить материал
                </button>
            </div>

            {loading ? (
                <div className="text-neutral-400">Загрузка...</div>
            ) : materials.length === 0 ? (
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                    Здесь пока нет материалов. Нажмите "Добавить материал", чтобы начать.
                </div>
            ) : (
                <div className="grid gap-4">
                    {materials.map(m => {
                        const readCount = m.assignments.filter(a => a.status === 'READ').length;
                        const totalCount = m.assignments.length;
                        return (
                            <div key={m.id} className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col md:flex-row gap-5">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">{m.title}</h3>
                                    {m.description && <p className="text-sm text-neutral-400 mb-2">{m.description}</p>}
                                    <div className="text-sm text-neutral-500 mb-3 hover:text-blue-400 transition-colors">
                                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
                                            {m.fileUrl}
                                        </a>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {m.departments ? JSON.parse(m.departments).map((d: string) => (
                                            <span key={d} className="bg-neutral-700 text-neutral-300 px-2 py-1 rounded">
                                                {d}
                                            </span>
                                        )) : <span className="text-neutral-500">Всем сотрудникам</span>}
                                    </div>
                                </div>
                                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-neutral-700 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
                                    <div>
                                        <div className="text-sm text-neutral-400 font-semibold mb-2 flex items-center gap-2">
                                            <Users size={16} /> Прогресс ознакомления
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {readCount} <span className="text-neutral-500 text-lg">/ {totalCount}</span>
                                        </div>
                                        {totalCount > 0 && (
                                            <div className="w-full bg-neutral-700 rounded-full h-1.5 mt-2">
                                                <div
                                                    className="bg-green-500 h-1.5 rounded-full"
                                                    style={{ width: `${(readCount / totalCount) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleDelete(m.id)}
                                            className="text-neutral-500 hover:text-red-400 p-2 rounded transition-colors"
                                            title="Удалить материал"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Create */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Новый обучающий материал</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Название *</label>
                                <input
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="Например: Должностная инструкция плавильщика"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Описание (опционально)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Ссылка на файл / PDF *</label>
                                <input
                                    required
                                    value={fileUrl}
                                    onChange={e => setFileUrl(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="https://"
                                />
                                <div className="text-xs text-neutral-500 mt-1 flex gap-1 items-start">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    Вставьте ссылку на Google Диск, Яндекс.Диск или другой облачный ресурс, доступный для чтения.
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">Назначить отделам (оставьте пустым для всех)</label>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {DEPARTMENTS.map(d => (
                                        <label key={d} className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedDeps.includes(d)}
                                                onChange={() => toggleDep(d)}
                                                className="rounded border-neutral-700 bg-neutral-900 text-orange-500 focus:ring-orange-500"
                                            />
                                            {d}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-neutral-700">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 font-bold py-2 rounded text-white transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 font-bold py-2 rounded text-white transition-colors">
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
