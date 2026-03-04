import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, Plus, Users, BookOpen, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface Employee {
    id: number;
    fullName: string;
    department: string | null;
    role: string;
}

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

const ROLES = [
    { value: 'WORKER', label: 'Рабочий' },
    { value: 'MASTER', label: 'Мастер' },
    { value: 'TECHNOLOGIST', label: 'Технолог' },
    { value: 'OTC', label: 'ОТК' },
    { value: 'DIRECTOR', label: 'Директор' },
    { value: 'ADMIN', label: 'Администратор' },
    { value: 'SALES', label: 'Менеджер по продажам' }
];

export default function TrainingAdmin() {
    const { user } = useAuth();
    const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [mats, emps] = await Promise.all([
                api.getTrainingMaterials(),
                api.getTrainingUsers()
            ]);
            setMaterials(mats);
            setEmployees(emps);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleDep = (dep: string) => setSelectedDeps(d =>
        d.includes(dep) ? d.filter(x => x !== dep) : [...d, dep]
    );

    const toggleRole = (role: string) => setSelectedRoles(r =>
        r.includes(role) ? r.filter(x => x !== role) : [...r, role]
    );

    const toggleUser = (id: number) => setSelectedUsers(u =>
        u.includes(id) ? u.filter(x => x !== id) : [...u, id]
    );

    const resetForm = () => {
        setTitle(''); setDescription(''); setFileUrl('');
        setSelectedDeps([]); setSelectedUsers([]); setSelectedRoles([]); setEmployeeSearch('');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedRoles.length === 0 && selectedDeps.length === 0 && selectedUsers.length === 0) {
            alert('Выберите хотя бы одну роль, отдел или конкретного сотрудника.');
            return;
        }

        try {
            await api.createTrainingMaterial({
                title,
                description,
                fileUrl,
                roles: selectedRoles,
                departments: selectedDeps,
                userIds: selectedUsers,
            });
            setShowCreate(false);
            resetForm();
            load();
        } catch (e: any) {
            alert('Ошибка при создании материала: ' + (e?.response?.data?.detail || e?.message || 'неизвестная ошибка'));
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
        return <div className="p-4 text-red-500">Доступ запрещен.</div>;
    }

    const filteredEmployees = employeeSearch
        ? employees.filter(e => e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) || (e.department || '').toLowerCase().includes(employeeSearch.toLowerCase()))
        : employees;

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
                <div className="text-neutral-400 animate-pulse">Загрузка...</div>
            ) : materials.length === 0 ? (
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center text-neutral-400">
                    Здесь пока нет материалов. Нажмите «Добавить материал», чтобы начать.
                </div>
            ) : (
                <div className="grid gap-4">
                    {materials.map(m => {
                        const readCount = m.assignments.filter(a => a.status === 'READ').length;
                        const totalCount = m.assignments.length;
                        const isExpanded = expandedId === m.id;
                        return (
                            <div key={m.id} className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
                                <div className="p-5 flex flex-col md:flex-row gap-5">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-1">{m.title}</h3>
                                        {m.description && <p className="text-sm text-neutral-400 mb-2">{m.description}</p>}
                                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm break-all">
                                            {m.fileUrl}
                                        </a>
                                        <div className="flex flex-wrap gap-2 text-xs mt-3">
                                            {m.departments ? JSON.parse(m.departments).map((d: string) => (
                                                <span key={d} className="bg-neutral-700 text-neutral-300 px-2 py-1 rounded">{d}</span>
                                            )) : null}
                                        </div>
                                    </div>
                                    <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-neutral-700 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
                                        <div>
                                            <div className="text-sm text-neutral-400 font-semibold mb-1 flex items-center gap-2">
                                                <Users size={16} /> Прогресс ознакомления
                                            </div>
                                            <div className="text-2xl font-bold text-white">
                                                {readCount} <span className="text-neutral-500 text-lg">/ {totalCount}</span>
                                            </div>
                                            {totalCount > 0 && (
                                                <div className="w-full bg-neutral-700 rounded-full h-1.5 mt-2">
                                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(readCount / totalCount) * 100}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex justify-between items-center">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                                                className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                {isExpanded ? <><ChevronUp size={14} /> Скрыть</> : <><ChevronDown size={14} /> Сотрудники</>}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(m.id)}
                                                className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-colors"
                                                title="Удалить"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable assignees list */}
                                {isExpanded && (
                                    <div className="border-t border-neutral-700 p-4">
                                        <div className="text-xs font-semibold uppercase text-neutral-500 mb-3">Назначенные сотрудники</div>
                                        {m.assignments.length === 0 ? (
                                            <div className="text-neutral-500 text-sm">Никто не назначен</div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {m.assignments.map(a => (
                                                    <div key={a.id} className={`rounded p-2 text-xs ${a.status === 'READ' ? 'bg-green-900/30 border border-green-800' : 'bg-neutral-700/50 border border-neutral-700'}`}>
                                                        <div className="font-bold text-white">{a.user.fullName}</div>
                                                        <div className="text-neutral-400">{a.user.department || '—'}</div>
                                                        <div className={`mt-1 font-semibold ${a.status === 'READ' ? 'text-green-400' : 'text-orange-400'}`}>
                                                            {a.status === 'READ' ? `✔ ${new Date(a.readAt!).toLocaleDateString('ru-RU')}` : 'Ожидает'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl my-4">
                        <h3 className="text-xl font-bold mb-4">Новый обучающий материал</h3>
                        <form onSubmit={handleCreate} className="space-y-4">

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Название *</label>
                                <input
                                    required value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="Должностная инструкция плавильщика"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Описание</label>
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500 resize-none"
                                />
                            </div>

                            {/* File URL */}
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Ссылка на файл / PDF *</label>
                                <input
                                    required value={fileUrl} onChange={e => setFileUrl(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                    placeholder="https://drive.google.com/... или другой URL"
                                />
                                <div className="text-xs text-neutral-500 mt-1 flex gap-1 items-start">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    Вставьте ссылку на Google Диск, Яндекс.Диск или другой ресурс.
                                </div>
                            </div>

                            {/* Assignment mode toggle */}
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">Кому назначить *</label>
                                <div className="text-sm text-neutral-500 mb-4">
                                    Вы можете выбрать любое сочетание ролей, отделов и конкретных сотрудников.
                                </div>

                                <div className="space-y-4">
                                    {/* Roles */}
                                    <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
                                        <div className="text-sm font-bold text-white mb-2">По ролям:</div>
                                        <div className="flex flex-wrap gap-2 text-sm">
                                            {ROLES.map(r => (
                                                <label key={r.value} className="flex items-center gap-2 text-neutral-300 cursor-pointer p-1.5 px-2 rounded hover:bg-neutral-700 transition-colors bg-neutral-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRoles.includes(r.value)}
                                                        onChange={() => toggleRole(r.value)}
                                                        className="rounded"
                                                    />
                                                    {r.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Departments */}
                                    <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
                                        <div className="text-sm font-bold text-white mb-2">По отделам:</div>
                                        <div className="flex flex-wrap gap-2 text-sm max-h-48 overflow-y-auto pr-1">
                                            {DEPARTMENTS.map(d => (
                                                <label key={d} className="flex items-center gap-2 text-neutral-300 cursor-pointer p-1.5 px-2 rounded hover:bg-neutral-700 transition-colors bg-neutral-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDeps.includes(d)}
                                                        onChange={() => toggleDep(d)}
                                                        className="rounded"
                                                    />
                                                    {d}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Specific Users */}
                                    <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
                                        <div className="text-sm font-bold text-white mb-2">Конкретным сотрудникам:</div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Поиск по имени или отделу..."
                                                value={employeeSearch}
                                                onChange={e => setEmployeeSearch(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white mb-2 outline-none focus:border-orange-500 text-sm"
                                            />
                                            <div className="max-h-48 overflow-y-auto border border-neutral-700 rounded bg-neutral-800">
                                                {Object.entries(
                                                    filteredEmployees.reduce((acc: Record<string, Employee[]>, emp) => {
                                                        const dep = emp.department || 'Без отдела';
                                                        if (!acc[dep]) acc[dep] = [];
                                                        acc[dep].push(emp);
                                                        return acc;
                                                    }, {})
                                                ).map(([dept, emps]) => (
                                                    <div key={dept}>
                                                        <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase bg-neutral-900 sticky top-0">{dept}</div>
                                                        {emps.map(emp => (
                                                            <label key={emp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-700 cursor-pointer transition-colors border-b border-neutral-800/50 last:border-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUsers.includes(emp.id)}
                                                                    onChange={() => toggleUser(emp.id)}
                                                                    className="rounded"
                                                                />
                                                                <span className="text-sm text-white">{emp.fullName}</span>
                                                                <span className="text-xs text-neutral-500 ml-auto">{emp.role}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <div className="p-4 text-center text-neutral-500 text-sm">Сотрудники не найдены</div>
                                                )}
                                            </div>
                                            {selectedUsers.length > 0 && (
                                                <div className="mt-2 text-sm text-orange-400 font-semibold">
                                                    Выбрано: {selectedUsers.length} персонально
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-neutral-700">
                                <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1 bg-neutral-700 hover:bg-neutral-600 font-bold py-2 rounded text-white transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 font-bold py-2 rounded text-white transition-colors">
                                    Сохранить и назначить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
