import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, type User } from '../../contexts/AuthContext';
import { Trash2, UserPlus, Shield, BookOpen, Save, ChevronDown, ChevronUp, Database } from 'lucide-react';

import API_URL from '../../config';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    WORKER: { label: 'Литейщик / Рабочий', color: 'text-orange-400' },
    MASTER: { label: 'Мастер', color: 'text-blue-400' },
    OTK: { label: 'Контролёр ОТК', color: 'text-purple-400' },
    DIRECTOR: { label: 'Руководитель', color: 'text-emerald-400' },
    TECH: { label: 'Технолог', color: 'text-teal-400' },
    SALES: { label: 'Менеджер продаж', color: 'text-orange-300' },
    ADMIN: { label: 'Администратор', color: 'text-red-400' },
    TMC: { label: 'Специалист ТМЦ', color: 'text-indigo-400' },
    STOREKEEPER: { label: 'Кладовщик', color: 'text-yellow-400' },
    TRAINER: { label: 'Учебный центр', color: 'text-pink-400' },
};

// Full default content — always visible in editor even if server unavailable
const DEFAULT_EDIT_STATE: Record<string, { title: string; content: string }> = {
    WORKER: {
        title: 'Инструкция Литейщика / Рабочего',
        content: `## 1. Просмотр сменного задания
Перейдите в раздел **«Мои Задачи»**. Там отображаются выделенные вам задачи мастером. Обращайте внимание на приоритет (Срочно / Высокий / Обычный).

## 2. Взятие задачи в работу
Когда вы готовы приступить, нажмите жёлтую кнопку **«Начать работу»** под карточкой задачи.

## 3. Сдача готовой партии
После завершения литья нажмите зелёную кнопку **«Сдать в ОТК (Завершить)»**.
- **Фактическое кол-во** — сколько деталей получилось
- **Уникальный номер партии** — номер для приёмки ОТК

## 4. Контроль качества
В нижней части страницы в таблице **«Статистика и приёмка ОТК»** отслеживайте статус приёмки.`
    },
    MASTER: {
        title: 'Инструкция Мастера производственного участка',
        content: `## 1. Создание плана и выдача задач
Перейдите в раздел **«Сменное задание»**:
- Выберите номенклатуру и метод литья
- Укажите плановое количество и приоритет
- Назначьте рабочего и нажмите **«Сохранить задачу»**

## 2. Контроль выполнения
Отслеживайте статусы: **Новая → В работе → Готово**

## 3. Заказы в производстве
В разделе **«Заказы в работе»** принимайте заказы от отдела продаж, отмечайте этапы и ставьте плановые/фактические даты.`
    },
    OTK: {
        title: 'Инструкция Контролёра ОТК',
        content: `## 1. Очередь на приёмку
В разделе **«ОТК и Инспекция»** на вкладке **«Ожидают проверки»** — все партии, сданные рабочими.

## 2. Проведение инспекции
- Нажмите **«Провести инспекцию»** рядом с партией
- Введите количество **Годных** и **Бракованных** деталей
- При наличии брака укажите причину
- Нажмите **«Сохранить отчёт»**

## 3. История проверок
На вкладке **«История проверок»** хранятся все проверенные партии.`
    },
    DIRECTOR: {
        title: 'Инструкция Руководителя',
        content: `## 1. Аналитика и показатели
В разделе **«Воронка (Аналитика)»** отображаются графики:
- Брак по участкам
- Производительность по цехам
- Себестоимость плавок

## 2. Задачи сотрудникам
В разделе **«Задачи сотрудникам»** выдавайте прямые поручения любому сотруднику.

## 3. Заказы от клиентов
В разделе **«Заказы от клиентов»** контролируйте все производственные заказы.`
    },
    TECH: {
        title: 'Инструкция Технолога',
        content: `## 1. Расчёт шихты
- Выберите марку сплава и вес завалки (кг)
- Отметьте материалы в наличии
- Нажмите **«🔄 Автоподбор»** для оптимального состава
- Нажмите **«💾 Сохранить расчёт»** для внесения в журнал

## 2. Дошихтовка
Если химия не попала в ГОСТ — перейдите в **«Дошихтовка»**, введите массу расплава и фактическую химию, нажмите **«Рассчитать добавки»**.

## 3. Журнал плавок
В разделе **«Журнал плавок»** просматривайте историю расчётов.`
    },
    SALES: {
        title: 'Инструкция Менеджера по продажам',
        content: `## 1. Создание заказа
Нажмите **«+ Новый заказ»** и заполните:
- Клиент / Организация, контакты, срок поставки
- Позиции: деталь, кол-во, марка сплава, вес

## 2. Статусы заказа
- 🔵 **Новый** — ждёт мастера
- 🟡 **В производстве** — идёт изготовление
- 🟢 **Готов** — нажмите «Отгрузить»

## 3. Прогресс по этапам
Прогресс-бар из 7 этапов показывает ход производства.

## 4. Переписка с мастером
В панели заказа (справа) доступен чат с мастером.`
    },
    ADMIN: {
        title: 'Инструкция Администратора системы',
        content: `## Управление персоналом
Вкладка **«Сотрудники»** — создавайте аккаунты:
- При создании Рабочего / Мастера **обязательно** указывайте цех
- Для менеджера выбирайте роль **«Менеджер продаж»**

## Редактирование инструкций
Вкладка **«Инструкции»** — раскройте роль, отредактируйте текст, нажмите **«Сохранить»**.

## Форматирование (Markdown)
- **## Заголовок** — раздел
- **жирный текст** через двойные звёздочки
- **- пункт** — элемент списка`
    },
    TMC: {
        title: 'Инструкция Специалиста ТМЦ',
        content: `## 1. Складской учет\nВ разделе **«ТМЦ и Склад»** отслеживайте остатки готовой продукции по партиям и ячейкам.\n\n## 2. Отгрузки\nСоздавайте задания на отгрузку для кладовщика, указывая заказ и нужные партии деталей.\n\n## 3. Отчет по ЗП\nФормируйте выгрузку для расчета сдельной зарплаты литейщиков на основе выпущенных и принятых ОТК партий.`
    },
    STOREKEEPER: {
        title: 'Инструкция Кладовщика',
        content: `## 1. Приемка из ОТК\nВ разделе **«Складская Логистика»** принимайте проверенные детали из буфера ОТК и размещайте их по ячейкам адресного хранения (сканируйте/вводите адрес).\n\n## 2. Сборка отгрузок\nПолучайте задания на отгрузку от ТМЦ. Находите нужные детали в указанных ячейках и подтверждайте сборку нужного количества.`
    },
    TRAINER: {
        title: 'Инструкция Учебного центра',
        content: `## 1. Обучение\nВ разделе **«Администрирование обучения»** добавляйте новые инструкции и материалы для сотрудников.\n\n## 2. Матрица компетенций\nОтслеживайте, кто из сотрудников ознакомился с материалами.`
    },
};


interface InstructionPage {
    id: number | null;
    roleKey: string;
    title: string;
    content: string;
}

const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'instructions'>('users');

    // Users state
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('WORKER');
    const [department, setDepartment] = useState('');

    // Instructions state — pre-populated with defaults so accordion always shows
    const [instrLoading, setInstrLoading] = useState(true);
    const [editState, setEditState] = useState<Record<string, { title: string; content: string }>>(DEFAULT_EDIT_STATE);
    const [expandedRole, setExpandedRole] = useState<string | null>('WORKER');
    const [saving, setSaving] = useState<string | null>(null);
    const [downloadingBackup, setDownloadingBackup] = useState(false);

    const getToken = () => localStorage.getItem('token');

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructions = async () => {
        setInstrLoading(true);
        const token = getToken();
        try {
            const res = await axios.get(`${API_URL}/instructions`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (Array.isArray(res.data)) {
                const merged = { ...DEFAULT_EDIT_STATE };
                res.data.forEach((p: InstructionPage) => {
                    if (p.roleKey && p.title && p.content) {
                        merged[p.roleKey] = { title: p.title, content: p.content };
                    }
                });
                setEditState(merged);
            }
        } catch (e) {
            console.error('Failed to fetch instructions — showing defaults', e);
            // Keep DEFAULT_EDIT_STATE already set as initial state
        } finally {
            setInstrLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchInstructions();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/auth/register`, { login, password, fullName, role, department });
            fetchUsers();
            setLogin(''); setPassword(''); setFullName(''); setDepartment('');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка при создании пользователя');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm('Уверены, что хотите удалить сотрудника?')) return;
        try {
            await axios.delete(`${API_URL}/users/${id}`);
            fetchUsers();
        } catch {
            alert('Ошибка при удалении');
        }
    };

    const handleSaveInstruction = async (roleKey: string) => {
        const data = editState[roleKey];
        if (!data?.title || !data?.content) return alert('Заполните заголовок и содержание');
        setSaving(roleKey);
        try {
            await axios.put(
                `${API_URL}/instructions/${roleKey}`,
                data,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            fetchInstructions();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка сохранения');
        } finally {
            setSaving(null);
        }
    };

    const handleDownloadBackup = async () => {
        setDownloadingBackup(true);
        try {
            const token = getToken();
            const res = await axios.get(`${API_URL}/admin/backup`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Important for file handling
            });

            // Extract filename if Content-Disposition is set
            let filename = `erp_backup_${new Date().toISOString().split('T')[0]}.sql`;
            const disposition = res.headers['content-disposition'];
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const regex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = regex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            console.error('Backup Error:', e);
            if (e.response && e.response.data && e.response.data.type === 'application/json') {
                // Parse blob response back to json to read error message
                const text = await (new Response(e.response.data)).text();
                try {
                    const json = JSON.parse(text);
                    alert(json.error || 'Ошибка при скачивании бэкапа.');
                } catch {
                    alert('Ошибка при скачивании бэкапа.');
                }
            } else {
                alert('Ошибка при скачивании бэкапа. Возможно утилиты БД не доступны на сервере (ожидается при локальном запуске Windows).');
            }
        } finally {
            setDownloadingBackup(false);
        }
    };

    if (user?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-red-500 font-bold">У вас нет прав администратора</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Shield /> Панель Администратора</h2>

                <button
                    onClick={handleDownloadBackup}
                    disabled={downloadingBackup}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-lg border border-neutral-700 transition-colors shadow-sm disabled:opacity-50"
                    title="Скачать полную резервную копию базы данных (.sql)"
                >
                    <Database size={18} />
                    {downloadingBackup ? 'Создание архива...' : 'Выгрузить базу данных'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-900 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                    <UserPlus size={16} /> Сотрудники
                </button>
                <button
                    onClick={() => setActiveTab('instructions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'instructions' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                    <BookOpen size={16} /> Инструкции
                </button>
            </div>

            {/* ====== USERS TAB ====== */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ADD USER FORM */}
                    <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 h-fit">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-neutral-700 pb-2">
                            <UserPlus size={20} /> Добавить сотрудника
                        </h3>
                        <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-neutral-400 mb-1">ФИО</label>
                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none" placeholder="Иванов И. И." />
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1">Логин</label>
                                <input type="text" value={login} onChange={e => setLogin(e.target.value)} required
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none" placeholder="ivanov_i" />
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1">Пароль</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1">Роль</label>
                                <select value={role} onChange={e => setRole(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none">
                                    <option value="WORKER">Рабочий (Общий)</option>
                                    <option value="TRIMMER">Обрубщик</option>
                                    <option value="MOULDER">Формовщик</option>
                                    <option value="POURER">Заливщик</option>
                                    <option value="KNOCKER">Выбивщик</option>
                                    <option value="FINISHER">Доработчик</option>
                                    <option value="OTK">Сотрудник ОТК</option>
                                    <option value="TECH">Технолог</option>
                                    <option value="MASTER">Мастер</option>
                                    <option value="SALES">Менеджер продаж</option>
                                    <option value="DIRECTOR">Директор</option>
                                    <option value="TMC">Специалист ТМЦ</option>
                                    <option value="STOREKEEPER">Кладовщик</option>
                                    <option value="TRAINER">Учебный центр</option>
                                    <option value="ADMIN">Админ</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1">Участок / Бригада (цех)</label>
                                <select value={department} onChange={e => setDepartment(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 focus:border-blue-500 outline-none">
                                    <option value="">Не указан</option>
                                    <option value="ХТС">ХТС</option>
                                    <option value="Кокиль">Кокиль</option>
                                    <option value="МЛПД">МЛПД</option>
                                    <option value="ОТК">ОТК</option>
                                </select>
                            </div>
                            <button type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition-colors mt-2">
                                Зарегистрировать
                            </button>
                        </form>
                    </div>

                    {/* USER LIST */}
                    <div className="md:col-span-2 bg-neutral-800 p-6 rounded-lg border border-neutral-700">
                        <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">Список сотрудников</h3>
                        {loading ? (
                            <div className="text-neutral-400 animate-pulse">Загрузка...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-neutral-900 text-neutral-400 border-b border-neutral-700">
                                            <th className="p-3">ID</th>
                                            <th className="p-3">ФИО</th>
                                            <th className="p-3">Логин</th>
                                            <th className="p-3">Роль</th>
                                            <th className="p-3">Подразделение</th>
                                            <th className="p-3 text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} className="border-b border-neutral-700 hover:bg-neutral-700/50 transition-colors">
                                                <td className="p-3">#{u.id}</td>
                                                <td className="p-3 font-medium">{u.fullName}</td>
                                                <td className="p-3 text-neutral-400">{u.login}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold leading-none ${u.role === 'ADMIN' ? 'bg-red-900 text-red-100' : u.role === 'MASTER' ? 'bg-orange-900 text-orange-100' : u.role === 'OTK' ? 'bg-purple-900 text-purple-100' : u.role === 'SALES' ? 'bg-orange-800 text-orange-200' : 'bg-blue-900 text-blue-100'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-neutral-400">{(u as any).department || '-'}</td>
                                                <td className="p-3 text-right flex justify-end">
                                                    <button onClick={() => handleDeleteUser(u.id)}
                                                        disabled={u.id === user?.id}
                                                        className="text-red-500 hover:text-red-400 p-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        title="Удалить сотрудника">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr><td colSpan={6} className="p-4 text-center text-neutral-500">Пользователей не найдено</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== INSTRUCTIONS TAB ====== */}
            {activeTab === 'instructions' && (
                <div className="space-y-3">
                    <p className="text-sm text-neutral-400">
                        Редактируйте инструкции для каждой роли. Поддерживается Markdown (** жирный **, ## заголовок, - списки).
                    </p>
                    {instrLoading ? (
                        <div className="text-neutral-400 animate-pulse">Загрузка...</div>
                    ) : (
                        Object.entries(ROLE_LABELS).map(([roleKey, meta]) => {
                            const isExpanded = expandedRole === roleKey;
                            const editData = editState[roleKey] || { title: '', content: '' };
                            const isSaving = saving === roleKey;

                            return (
                                <div key={roleKey} className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedRole(isExpanded ? null : roleKey)}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-750 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <BookOpen size={18} className={meta.color} />
                                            <span className={`font-bold ${meta.color}`}>{meta.label}</span>
                                            <span className="text-xs text-neutral-500 font-mono">{roleKey}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-neutral-700 p-5 space-y-3">
                                            <div>
                                                <label className="block text-xs text-neutral-500 mb-1 font-semibold uppercase tracking-wider">Заголовок инструкции</label>
                                                <input
                                                    value={editData.title}
                                                    onChange={e => setEditState(s => ({ ...s, [roleKey]: { ...s[roleKey], title: e.target.value } }))}
                                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                                                    placeholder="Название инструкции..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-neutral-500 mb-1 font-semibold uppercase tracking-wider">Содержание (Markdown)</label>
                                                <textarea
                                                    value={editData.content}
                                                    onChange={e => setEditState(s => ({ ...s, [roleKey]: { ...s[roleKey], content: e.target.value } }))}
                                                    rows={12}
                                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors resize-y font-mono leading-relaxed"
                                                    placeholder="## Раздел 1&#10;Текст инструкции...&#10;&#10;- Пункт 1&#10;- Пункт 2"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-neutral-600">Используйте ## для заголовков, **текст** для жирного, - для списков</p>
                                                <button
                                                    onClick={() => handleSaveInstruction(roleKey)}
                                                    disabled={isSaving}
                                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                                                >
                                                    <Save size={15} />
                                                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
