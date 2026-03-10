import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
    ShoppingCart, Plus, Trash2, MessageCircle, X, CheckCircle,
    Clock, Package, AlertTriangle, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface OrderItem {
    id?: number;
    itemName: string;
    quantity: number;
    weight?: number;
    alloyName?: string;
    pricePerUnit?: number;
}

interface OrderStage {
    id: number;
    stageKey: string;
    label: string;
    sortOrder: number;
    status: string;
    plannedDate?: string;
    actualDate?: string;
    note?: string;
}

interface OrderComment {
    id: number;
    text: string;
    createdAt: string;
    author: { fullName: string; role: string };
}

interface Order {
    id: number;
    orderNumber: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    notes?: string;
    deadline: string;
    status: string;
    totalAmount?: number;
    createdAt: string;
    createdBy: { fullName: string };
    master?: { fullName: string } | null;
    items: OrderItem[];
    stages: OrderStage[];
    comments: OrderComment[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    NEW: { label: 'Новый', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50', icon: Clock },
    ACCEPTED: { label: 'Принят', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50', icon: CheckCircle },
    IN_PROGRESS: { label: 'В производстве', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50', icon: Package },
    READY: { label: 'Готов к отгрузке', color: 'bg-green-900/40 text-green-300 border-green-700/50', icon: CheckCircle },
    SHIPPED: { label: 'Отгружен', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50', icon: CheckCircle },
    CLOSED: { label: 'Закрыт', color: 'bg-neutral-700/60 text-neutral-400 border-neutral-600', icon: X },
};

const STAGE_STATUS_COLOR: Record<string, string> = {
    PENDING: 'bg-neutral-700/50 text-neutral-400',
    IN_PROGRESS: 'bg-yellow-800/50 text-yellow-300',
    DONE: 'bg-green-800/50 text-green-300',
    SKIPPED: 'bg-neutral-800 text-neutral-600',
};

const EMPTY_FORM = { clientName: '', clientPhone: '', clientEmail: '', notes: '', deadline: '', totalAmount: '' };

export default function SalesDashboard() {
    const { user } = useAuth();
    const { showNotification, confirm } = useNotifications();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selected, setSelected] = useState<Order | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [items, setItems] = useState<OrderItem[]>([{ itemName: '', quantity: 1 }]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [stagesExpanded, setStagesExpanded] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.getOrders();
            setOrders(data);
            if (selected) {
                const updated = data.find((o: Order) => o.id === selected.id);
                if (updated) setSelected(updated);
            }
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientName || !form.deadline) return showNotification('Заполните Клиент и Срок', 'warning');
        if (items.some(it => !it.itemName || !it.quantity)) return showNotification('Заполните позиции заказа', 'warning');
        try {
            await api.createOrder({ ...form, totalAmount: form.totalAmount ? Number(form.totalAmount) : null, items });
            setShowCreate(false);
            setForm(EMPTY_FORM);
            setItems([{ itemName: '', quantity: 1 }]);
            load();
            showNotification('Заказ успешно создан', 'success');
        } catch (e: any) {
            showNotification(e?.response?.data?.error || 'Ошибка создания заказа', 'error');
        }
    };

    const handleShip = async (orderId: number) => {
        if (!await confirm({ message: 'Отметить заказ как отгруженный?', confirmText: 'Отгрузить' })) return;
        try {
            await api.updateOrder(orderId, { status: 'SHIPPED' });
            load();
            showNotification('Заказ отгружен', 'success');
        } catch { showNotification('Ошибка', 'error'); }
    };

    const handleDelete = async (orderId: number) => {
        if (!await confirm({ message: 'Удалить заказ? Это действие необратимо.', type: 'danger', confirmText: 'Удалить' })) return;
        try {
            await api.deleteOrder(orderId);
            if (selected?.id === orderId) setSelected(null);
            load();
            showNotification('Заказ удален', 'success');
        } catch { showNotification('Ошибка удаления', 'error'); }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !selected) return;
        try {
            await api.addOrderComment(selected.id, commentText);
            setCommentText('');
            load();
        } catch { showNotification('Ошибка отправки сообщения', 'error'); }
    };

    const isOverdue = (order: Order) =>
        !['SHIPPED', 'CLOSED'].includes(order.status) &&
        new Date(order.deadline) < new Date();

    const canCreate = ['SALES', 'DIRECTOR', 'ADMIN'].includes(user?.role || '');

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ShoppingCart className="text-orange-400" /> Заказы от Клиентов
                </h2>
                {canCreate && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={18} /> Новый заказ
                    </button>
                )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(STATUS_META).slice(0, 4).map(([key, meta]) => {
                    const count = orders.filter(o => o.status === key).length;
                    return (
                        <div key={key} className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-white">{count}</div>
                            <div className="text-xs text-neutral-400 mt-0.5">{meta.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Orders list */}
                <div className="lg:col-span-2 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {loading && <div className="text-neutral-400 animate-pulse">Загрузка...</div>}
                    {!loading && orders.length === 0 && (
                        <div className="text-neutral-500 text-center py-10">
                            <ShoppingCart size={40} className="mx-auto mb-2 text-neutral-700" />
                            Заказов пока нет
                        </div>
                    )}
                    {orders.map(order => {
                        const meta = STATUS_META[order.status] || STATUS_META['NEW'];
                        const overdue = isOverdue(order);
                        const isActive = selected?.id === order.id;
                        return (
                            <div
                                key={order.id}
                                onClick={() => setSelected(order)}
                                className={`bg-neutral-800 border rounded-xl p-4 cursor-pointer transition-all hover:bg-neutral-750
                                    ${isActive ? 'ring-2 ring-orange-500/50 border-orange-700/40' : 'border-neutral-700'}
                                    ${overdue ? 'border-l-4 border-l-red-500' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                        <span className="text-xs text-neutral-500 font-mono">{order.orderNumber}</span>
                                        <div className="font-bold text-white">{order.clientName}</div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                                            {meta.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-xs text-neutral-400 flex items-center justify-between flex-wrap gap-1 mt-2">
                                    <span>{order.items.length} поз. · {order.items.reduce((s, i) => s + i.quantity, 0)} шт.</span>
                                    <span className={overdue ? 'text-red-400 font-bold flex items-center gap-1' : 'text-neutral-500'}>
                                        {overdue && <AlertTriangle size={11} />}
                                        Срок: {new Date(order.deadline).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                                {order.master && (
                                    <div className="text-xs text-neutral-500 mt-1">Мастер: {order.master.fullName}</div>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                    {/* mini progress */}
                                    <div className="flex gap-0.5">
                                        {order.stages.map(s => (
                                            <div
                                                key={s.id}
                                                title={s.label}
                                                className={`h-1.5 w-4 rounded-full ${s.status === 'DONE' ? 'bg-green-500' : s.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 'bg-neutral-700'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-neutral-600 flex items-center gap-1">
                                        <MessageCircle size={11} />{order.comments.length}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Order detail */}
                <div className="lg:col-span-3 bg-neutral-800 rounded-xl border border-neutral-700 p-5 max-h-[70vh] flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col gap-2">
                            <ShoppingCart size={40} className="text-neutral-700" />
                            Выберите заказ для просмотра
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="text-xs text-neutral-500 font-mono">{selected.orderNumber}</div>
                                    <h3 className="text-xl font-bold text-white">{selected.clientName}</h3>
                                    {selected.clientPhone && <div className="text-sm text-neutral-400">{selected.clientPhone}</div>}
                                </div>
                                <div className="flex gap-2">
                                    {selected.status === 'READY' && (
                                        <button
                                            onClick={() => handleShip(selected.id)}
                                            className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                        >
                                            Отгрузить
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(selected.id)}
                                        className="text-neutral-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="text-xs text-neutral-500 mb-3 flex items-center flex-wrap gap-3">
                                <span>Срок: <span className={isOverdue(selected) ? 'text-red-400 font-bold' : 'text-white'}>{new Date(selected.deadline).toLocaleDateString('ru-RU')}</span></span>
                                {selected.master && <span>Мастер: <span className="text-white">{selected.master.fullName}</span></span>}
                                {selected.totalAmount && <span>Сумма: <span className="text-emerald-400 font-bold">{selected.totalAmount.toLocaleString()} ₽</span></span>}
                            </div>

                            {/* Items */}
                            {selected.items.length > 0 && (
                                <div className="mb-3 bg-neutral-900/60 rounded-lg p-3 border border-neutral-700/50">
                                    <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Позиции заказа</div>
                                    {selected.items.map((it, i) => (
                                        <div key={i} className="flex justify-between text-sm py-0.5">
                                            <span className="text-neutral-200">{it.itemName} {it.alloyName ? `(${it.alloyName})` : ''}</span>
                                            <span className="text-neutral-400">{it.quantity} шт. {it.weight ? `· ${it.weight} кг/шт.` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Production stages */}
                            <div className="mb-3">
                                <button
                                    onClick={() => setStagesExpanded(!stagesExpanded)}
                                    className="flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2 hover:text-white transition-colors"
                                >
                                    Этапы производства {stagesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {stagesExpanded && (
                                    <div className="flex flex-wrap gap-2">
                                        {selected.stages.map(stage => (
                                            <div
                                                key={stage.id}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${STAGE_STATUS_COLOR[stage.status] || STAGE_STATUS_COLOR['PENDING']}`}
                                            >
                                                <div className="font-bold">{stage.label}</div>
                                                {stage.plannedDate && <div className="opacity-70">план: {new Date(stage.plannedDate).toLocaleDateString('ru-RU')}</div>}
                                                {stage.actualDate && <div className="text-green-400">факт: {new Date(stage.actualDate).toLocaleDateString('ru-RU')}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Comments */}
                            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 min-h-0">
                                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Переписка</div>
                                {selected.comments.length === 0 && <div className="text-neutral-600 text-sm">Сообщений пока нет</div>}
                                {selected.comments.map(c => {
                                    const isSales = ['SALES', 'DIRECTOR', 'ADMIN'].includes(c.author.role);
                                    return (
                                        <div key={c.id} className={`flex gap-2 ${isSales ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-2.5 rounded-xl text-sm border ${isSales
                                                ? 'bg-orange-800/30 text-orange-100 border-orange-700/40'
                                                : 'bg-neutral-700 text-neutral-200 border-neutral-600'}`}>
                                                <div className="font-bold text-xs mb-0.5">{c.author.fullName}</div>
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
                                    placeholder="Написать сообщение..."
                                    rows={2}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-sm resize-none outline-none focus:border-orange-500 transition-colors"
                                />
                                <button onClick={handleComment} className="bg-orange-600 hover:bg-orange-500 text-white px-3 rounded-lg transition-colors self-end py-2">
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Order Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Новый заказ</h3>
                            <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Клиент / Организация *</label>
                                    <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500" required />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Телефон</label>
                                    <input value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Email</label>
                                    <input value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Срок поставки *</label>
                                    <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500" required />
                                </div>
                                <div>
                                    <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Сумма заказа, ₽</label>
                                    <input type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold text-xs uppercase">Примечание</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    rows={2} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-orange-500 resize-none" />
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-neutral-400 font-semibold text-xs uppercase">Позиции заказа *</label>
                                    <button type="button" onClick={() => setItems([...items, { itemName: '', quantity: 1 }])}
                                        className="text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1 transition-colors">
                                        <Plus size={13} /> Добавить позицию
                                    </button>
                                </div>
                                {items.map((it, i) => (
                                    <div key={i} className="grid grid-cols-6 gap-2 mb-2 items-start">
                                        <input
                                            value={it.itemName}
                                            onChange={e => { const n = [...items]; n[i].itemName = e.target.value; setItems(n); }}
                                            placeholder="Название детали"
                                            className="col-span-2 bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                                        />
                                        <input
                                            type="number" min="1"
                                            value={it.quantity}
                                            onChange={e => { const n = [...items]; n[i].quantity = Number(e.target.value); setItems(n); }}
                                            placeholder="Кол-во"
                                            className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                                        />
                                        <input
                                            value={it.alloyName || ''}
                                            onChange={e => { const n = [...items]; n[i].alloyName = e.target.value; setItems(n); }}
                                            placeholder="Марка сплава"
                                            className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                                        />
                                        <input
                                            type="number" step="0.1"
                                            value={it.weight || ''}
                                            onChange={e => { const n = [...items]; n[i].weight = Number(e.target.value) || undefined; setItems(n); }}
                                            placeholder="Вес, кг"
                                            className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                                        />
                                        <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
                                            className="text-neutral-600 hover:text-red-400 transition-colors pt-2">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setShowCreate(false)}
                                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">
                                    Отмена
                                </button>
                                <button type="submit"
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded transition-colors">
                                    Создать заказ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
