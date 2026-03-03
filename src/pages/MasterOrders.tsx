import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    Package, CheckCircle, Clock, AlertTriangle, Send, Play
} from 'lucide-react';

interface OrderItem {
    id: number;
    itemName: string;
    quantity: number;
    weight?: number;
    alloyName?: string;
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
    deadline: string;
    status: string;
    createdBy: { fullName: string };
    master?: { fullName: string } | null;
    items: OrderItem[];
    stages: OrderStage[];
    comments: OrderComment[];
}

const STATUS_META: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Новый', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
    ACCEPTED: { label: 'Принят', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50' },
    IN_PROGRESS: { label: 'В производстве', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' },
    READY: { label: 'Готов', color: 'bg-green-900/40 text-green-300 border-green-700/50' },
    SHIPPED: { label: 'Отгружен', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
    CLOSED: { label: 'Закрыт', color: 'bg-neutral-700/60 text-neutral-400 border-neutral-600' },
};

const STAGE_STATUS_CYCLE: Record<string, string> = {
    PENDING: 'IN_PROGRESS',
    IN_PROGRESS: 'DONE',
    DONE: 'DONE',
};

export default function MasterOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selected, setSelected] = useState<Order | null>(null);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [stageDates, setStageDates] = useState<Record<number, { plannedDate: string; actualDate: string }>>({});

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

    const handleAccept = async (orderId: number) => {
        try {
            await api.updateOrder(orderId, { status: 'ACCEPTED' });
            load();
        } catch { alert('Ошибка принятия заказа'); }
    };

    const handleStageUpdate = async (orderId: number, stage: OrderStage) => {
        const nextStatus = STAGE_STATUS_CYCLE[stage.status] || stage.status;
        const stageDateEntry = stageDates[stage.id] || {};
        try {
            await api.updateOrderStage(orderId, stage.id, {
                status: nextStatus,
                plannedDate: stageDateEntry.plannedDate || undefined,
                actualDate: nextStatus === 'DONE' ? (stageDateEntry.actualDate || new Date().toISOString().split('T')[0]) : stageDateEntry.actualDate || undefined,
            });
            // Auto-update order status if needed
            const updated = await api.getOrders();
            const order = updated.find((o: Order) => o.id === orderId);
            if (order) {
                const allStages: OrderStage[] = order.stages;
                const allDone = allStages.every((s: OrderStage) => s.status === 'DONE' || s.status === 'SKIPPED');
                if (allDone && order.status === 'IN_PROGRESS') {
                    await api.updateOrder(orderId, { status: 'READY' });
                } else if (order.status === 'ACCEPTED') {
                    await api.updateOrder(orderId, { status: 'IN_PROGRESS' });
                }
            }
            load();
        } catch (e) { console.error(e); alert('Ошибка обновления этапа'); }
    };

    const handleStageDateChange = (stageId: number, field: 'plannedDate' | 'actualDate', value: string) => {
        setStageDates(prev => ({
            ...prev,
            [stageId]: { ...prev[stageId], [field]: value }
        }));
    };

    const handleStageDateSave = async (orderId: number, stage: OrderStage) => {
        const dates = stageDates[stage.id] || {};
        try {
            await api.updateOrderStage(orderId, stage.id, {
                plannedDate: dates.plannedDate || undefined,
                actualDate: dates.actualDate || undefined,
            });
            load();
        } catch { alert('Ошибка сохранения дат'); }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !selected) return;
        try {
            await api.addOrderComment(selected.id, commentText);
            setCommentText('');
            load();
        } catch { alert('Ошибка'); }
    };

    const isOverdue = (order: Order) =>
        !['SHIPPED', 'CLOSED'].includes(order.status) &&
        new Date(order.deadline) < new Date();

    const stageStatusColor = (status: string) => {
        if (status === 'DONE') return 'bg-green-600/30 border-green-600/50 text-green-300';
        if (status === 'IN_PROGRESS') return 'bg-yellow-700/30 border-yellow-600/50 text-yellow-300';
        if (status === 'SKIPPED') return 'bg-neutral-800 border-neutral-700 text-neutral-600';
        return 'bg-neutral-800/60 border-neutral-700 text-neutral-400';
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="text-cyan-400" /> Производственные заказы
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Orders list */}
                <div className="lg:col-span-2 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                    {loading && <div className="text-neutral-400 animate-pulse">Загрузка...</div>}
                    {!loading && orders.length === 0 && (
                        <div className="text-neutral-500 text-center py-10">
                            <Package size={40} className="mx-auto mb-2 text-neutral-700" />
                            Нет активных заказов
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
                                className={`bg-neutral-800 border rounded-xl p-4 cursor-pointer transition-all
                                    ${isActive ? 'ring-2 ring-cyan-500/50 border-cyan-700/40' : 'border-neutral-700'}
                                    ${overdue ? '!border-l-4 !border-l-red-500' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                        <span className="text-xs text-neutral-500 font-mono">{order.orderNumber}</span>
                                        <div className="font-bold text-white">{order.clientName}</div>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${meta.color}`}>
                                        {meta.label}
                                    </span>
                                </div>
                                <div className="text-xs text-neutral-400 flex items-center justify-between mt-1">
                                    <span>{order.items.length} поз.</span>
                                    <span className={overdue ? 'text-red-400 font-bold flex items-center gap-1' : ''}>
                                        {overdue && <AlertTriangle size={11} />}
                                        Срок: {new Date(order.deadline).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                                {/* Stage mini-bar */}
                                <div className="flex gap-0.5 mt-2">
                                    {order.stages.map(s => (
                                        <div key={s.id} title={s.label}
                                            className={`h-1.5 flex-1 rounded-full ${s.status === 'DONE' ? 'bg-green-500' : s.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 'bg-neutral-700'}`} />
                                    ))}
                                </div>
                                {order.status === 'NEW' && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleAccept(order.id); }}
                                        className="mt-2 w-full bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold py-1 rounded transition-colors"
                                    >
                                        Принять в работу
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Order detail + stage management */}
                <div className="lg:col-span-3 bg-neutral-800 rounded-xl border border-neutral-700 p-5 max-h-[75vh] flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col gap-2">
                            <Package size={40} className="text-neutral-700" />
                            Выберите заказ для управления
                        </div>
                    ) : (
                        <>
                            <div className="mb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-neutral-500 font-mono">{selected.orderNumber}</span>
                                        <h3 className="text-xl font-bold text-white">{selected.clientName}</h3>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${(STATUS_META[selected.status] || STATUS_META['NEW']).color}`}>
                                        {(STATUS_META[selected.status] || STATUS_META['NEW']).label}
                                    </span>
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    Создал: {selected.createdBy?.fullName}
                                    <span className="mx-2">·</span>
                                    Срок: <span className={isOverdue(selected) ? 'text-red-400 font-bold' : 'text-white'}>
                                        {new Date(selected.deadline).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            {selected.items.length > 0 && (
                                <div className="mb-3 bg-neutral-900/60 rounded-lg p-3 border border-neutral-700/50 text-xs">
                                    <div className="text-neutral-500 font-semibold uppercase tracking-wider mb-1">Позиции</div>
                                    {selected.items.map((it, i) => (
                                        <div key={i} className="flex justify-between py-0.5">
                                            <span className="text-neutral-200">{it.itemName} {it.alloyName ? `(${it.alloyName})` : ''}</span>
                                            <span className="text-neutral-400">{it.quantity} шт.</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Stage controls */}
                            <div className="mb-3 flex-1 overflow-y-auto">
                                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Этапы производства</div>
                                <div className="space-y-2">
                                    {selected.stages.map(stage => {
                                        return (
                                            <div key={stage.id} className={`rounded-lg border p-3 ${stageStatusColor(stage.status)}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-sm">{stage.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        {stage.status === 'DONE' && <CheckCircle size={16} className="text-green-400" />}
                                                        {stage.status === 'IN_PROGRESS' && <Clock size={16} className="text-yellow-400 animate-pulse" />}
                                                        {stage.status !== 'DONE' && stage.status !== 'SKIPPED' && (
                                                            <button
                                                                onClick={() => handleStageUpdate(selected.id, stage)}
                                                                className="flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded text-xs font-bold transition-colors"
                                                            >
                                                                <Play size={10} />
                                                                {stage.status === 'PENDING' ? 'Начать' : 'Завершить'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <label className="block text-[10px] text-neutral-500 mb-0.5">Плановая дата</label>
                                                        <div className="flex gap-1">
                                                            <input type="date"
                                                                defaultValue={stage.plannedDate ? stage.plannedDate.split('T')[0] : ''}
                                                                onChange={e => handleStageDateChange(stage.id, 'plannedDate', e.target.value)}
                                                                disabled={stage.status === 'DONE' || stage.status === 'SKIPPED'}
                                                                className="flex-1 bg-neutral-900/80 border border-neutral-700 rounded p-1 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-neutral-500 mb-0.5">Фактическая дата</label>
                                                        <input type="date"
                                                            defaultValue={stage.actualDate ? stage.actualDate.split('T')[0] : ''}
                                                            onChange={e => handleStageDateChange(stage.id, 'actualDate', e.target.value)}
                                                            disabled={stage.status === 'DONE' || stage.status === 'SKIPPED'}
                                                            className="flex-1 w-full bg-neutral-900/80 border border-neutral-700 rounded p-1 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
                                                </div>
                                                {stage.status !== 'DONE' && stage.status !== 'SKIPPED' && (stageDates[stage.id]?.plannedDate || stageDates[stage.id]?.actualDate) && (
                                                    <button
                                                        onClick={() => handleStageDateSave(selected.id, stage)}
                                                        className="mt-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                                                    >
                                                        Сохранить даты
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="space-y-2 mb-2 max-h-28 overflow-y-auto pr-1">
                                {selected.comments.length === 0 && <div className="text-neutral-600 text-xs">Сообщений нет</div>}
                                {selected.comments.map(c => {
                                    const isSales = ['SALES', 'DIRECTOR', 'ADMIN'].includes(c.author.role);
                                    return (
                                        <div key={c.id} className={`flex gap-2 ${isSales ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[80%] p-2 rounded-xl text-xs border ${isSales
                                                ? 'bg-orange-800/30 text-orange-100 border-orange-700/30'
                                                : 'bg-neutral-700 text-neutral-200 border-neutral-600'}`}>
                                                <div className="font-bold mb-0.5">{c.author.fullName}</div>
                                                <div>{c.text}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2">
                                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                                    placeholder="Написать менеджеру..."
                                    rows={2}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-xs resize-none outline-none focus:border-cyan-500 transition-colors"
                                />
                                <button onClick={handleComment} className="bg-cyan-700 hover:bg-cyan-600 text-white px-3 rounded-lg transition-colors self-end py-2">
                                    <Send size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
