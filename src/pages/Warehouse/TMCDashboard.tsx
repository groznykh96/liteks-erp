import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Package, Truck, Calculator, MapPin, Plus, Calendar } from 'lucide-react';

export default function TMCDashboard() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'shipping' | 'salary'>('inventory');

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    Управление ТМЦ и Складом
                </h1>

                {/* Tabs */}
                <div className="flex space-x-1 bg-neutral-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'inventory' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                    >
                        <Package size={16} /> Остатки и Адреса
                    </button>
                    <button
                        onClick={() => setActiveTab('shipping')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'shipping' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                    >
                        <Truck size={16} /> Отгрузки
                    </button>
                    <button
                        onClick={() => setActiveTab('salary')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'salary' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                    >
                        <Calculator size={16} /> Отчет по ЗП
                    </button>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl border border-neutral-700/50 p-6 shadow-sm min-h-[500px]">
                {activeTab === 'inventory' && <InventoryTab />}
                {activeTab === 'shipping' && <ShippingTab />}
                {activeTab === 'salary' && <SalaryTab />}
            </div>
        </div>
    );
}

// --- 1. INVENTORY TAB ---
function InventoryTab() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const data = await api.getWarehouseInventory();
            setInventory(data);
        } catch (e) {
            console.error('Failed to load inventory', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const handlePrintQR = (item: any) => {
        alert(`Печать QR кода для ${item.nomenclature.name} (Партия: ${item.batch?.batchNumber || 'Н/Д'})\nАдрес: ${item.location}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Складские Остатки</h2>
                <button onClick={loadInventory} className="text-sm bg-neutral-700 text-white px-3 py-1.5 rounded hover:bg-neutral-600">
                    Обновить
                </button>
            </div>

            {loading ? (
                <div className="text-neutral-400 text-sm">Загрузка...</div>
            ) : inventory.length === 0 ? (
                <div className="text-neutral-400 text-sm py-4 text-center">Склад пуст</div>
            ) : (
                <div className="overflow-x-auto border border-neutral-700/50 rounded-lg">
                    <table className="w-full text-left text-sm text-neutral-300">
                        <thead className="text-xs uppercase bg-neutral-700/50 text-neutral-400">
                            <tr>
                                <th className="px-4 py-3">Номенклатура</th>
                                <th className="px-4 py-3">Партия</th>
                                <th className="px-4 py-3 text-right">Количество</th>
                                <th className="px-4 py-3">Адрес (Локация)</th>
                                <th className="px-4 py-3">Статус</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-700/50">
                            {inventory.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-700/20">
                                    <td className="px-4 py-3 font-medium text-white">{item.nomenclature.name}</td>
                                    <td className="px-4 py-3">{item.batch?.batchNumber || 'Без партии'}</td>
                                    <td className="px-4 py-3 text-right text-blue-400 font-bold">{item.quantity} шт</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={14} className="text-neutral-500" />
                                            {item.location}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${item.status === 'AVAILABLE' ? 'bg-green-500/10 text-green-400' :
                                            item.status === 'RESERVED' ? 'bg-orange-500/10 text-orange-400' :
                                                'bg-neutral-500/10 text-neutral-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handlePrintQR(item)}
                                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                                        >
                                            QR Код
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --- 2. SHIPPING TAB ---
function ShippingTab() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newOrder, setNewOrder] = useState({ orderId: '', notes: '', items: [] as any[] });
    const [availableNomenclatures, setAvailableNomenclatures] = useState<any[]>([]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await api.getShippingOrders();
            setOrders(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadNomenclatures = async () => {
        try {
            const data = await api.getNomenclature();
            setAvailableNomenclatures(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadOrders();
        loadNomenclatures();
    }, []);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createShippingOrder(newOrder);
            setIsCreating(false);
            setNewOrder({ orderId: '', notes: '', items: [] });
            loadOrders();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка создания задания');
        }
    };

    const handleAddItem = () => {
        setNewOrder(prev => ({ ...prev, items: [...prev.items, { nomId: '', batchId: '', requiredQty: 1 }] }));
    };

    const handleUpdateItem = (index: number, field: string, value: string) => {
        const updated = [...newOrder.items];
        updated[index] = { ...updated[index], [field]: value };
        setNewOrder(prev => ({ ...prev, items: updated }));
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...newOrder.items];
        updated.splice(index, 1);
        setNewOrder(prev => ({ ...prev, items: updated }));
    };

    const handleShipOrder = async (id: number) => {
        if (!confirm('Вы уверены, что хотите списать эту отгрузку со склада (OUTCOME)? Это действие нельзя отменить.')) return;
        try {
            await api.shipShippingOrder(id);
            alert('Успешно отгружено!');
            loadOrders();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка отгрузки');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Задания на отгрузку</h2>
                <div className="flex gap-2">
                    <button onClick={loadOrders} className="text-sm bg-neutral-700 text-white px-3 py-1.5 rounded hover:bg-neutral-600">
                        Обновить
                    </button>
                    {!isCreating && (
                        <button onClick={() => setIsCreating(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-blue-500">
                            <Plus size={16} /> Создать задание
                        </button>
                    )}
                </div>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateOrder} className="bg-neutral-700/30 border border-neutral-600 rounded-lg p-4 space-y-4">
                    <h3 className="text-white font-medium">Новое задание на отгрузку</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">ID Заказа (опционально)</label>
                            <input
                                type="text"
                                value={newOrder.orderId}
                                onChange={e => setNewOrder({ ...newOrder, orderId: e.target.value })}
                                className="w-full bg-neutral-800 border border-neutral-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-blue-500"
                                placeholder="Номер или ID"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Заметки / Примечание</label>
                            <input
                                type="text"
                                value={newOrder.notes}
                                onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                                className="w-full bg-neutral-800 border border-neutral-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-blue-500"
                                placeholder="Для кладовщика..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-400">Позиции к отгрузке</label>
                        {newOrder.items.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-neutral-800 p-2 rounded border border-neutral-700">
                                <select
                                    className="flex-1 bg-neutral-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                                    value={item.nomId}
                                    onChange={e => handleUpdateItem(idx, 'nomId', e.target.value)}
                                    required
                                >
                                    <option value="">-- Выберите деталь --</option>
                                    {availableNomenclatures.map(n => (
                                        <option key={n.id} value={n.id}>{n.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="ID Партии (опц.)"
                                    value={item.batchId}
                                    onChange={e => handleUpdateItem(idx, 'batchId', e.target.value)}
                                    className="w-32 bg-neutral-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Кол-во"
                                    value={item.requiredQty}
                                    onChange={e => handleUpdateItem(idx, 'requiredQty', e.target.value)}
                                    className="w-24 bg-neutral-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                                    required
                                />
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300 p-1">
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddItem} className="text-xs text-blue-400 hover:text-blue-300">
                            + Добавить позицию
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm text-neutral-300 hover:text-white transition-colors">
                            Отмена
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50" disabled={newOrder.items.length === 0}>
                            Сохранить задание
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-neutral-400 text-sm">Загрузка...</div>
            ) : orders.length === 0 ? (
                <div className="text-neutral-400 text-sm text-center py-4">Нет заданий на отгрузку</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 text-sm">
                    {orders.map(o => (
                        <div key={o.id} className="border border-neutral-700 rounded-lg p-4 bg-neutral-800/50 flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold text-base">Задание #{o.orderNumber}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.status === 'NEW' ? 'bg-blue-500/10 text-blue-400' :
                                        o.status === 'GATHERING' ? 'bg-orange-500/10 text-orange-400' :
                                            o.status === 'READY' ? 'bg-green-500/10 text-green-400' :
                                                'bg-neutral-600/50 text-neutral-400'
                                        }`}>
                                        {o.status === 'NEW' ? 'Новый' : o.status === 'GATHERING' ? 'Собирается' : o.status === 'READY' ? 'Собран' : 'Отгружен'}
                                    </span>
                                </div>
                                <div className="text-neutral-400 mb-2">
                                    Создал: <span className="text-neutral-300">{o.createdBy?.fullName}</span><br />
                                    {o.notes && <span className="italic">"{o.notes}"</span>}
                                </div>
                                <div className="space-y-1">
                                    {o.items.map((i: any) => (
                                        <div key={i.id} className="flex justify-between bg-neutral-700/30 px-3 py-1.5 rounded">
                                            <span className="text-neutral-300">
                                                {i.nomenclature.name} {i.batch ? `(Партия: ${i.batch.batchNumber})` : ''}
                                            </span>
                                            <span className="font-medium text-white">
                                                <span className={i.pickedQty >= i.requiredQty ? 'text-green-400' : 'text-orange-400'}>
                                                    {i.pickedQty}
                                                </span>
                                                <span className="text-neutral-500 mx-1">/</span>
                                                {i.requiredQty} шт
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-neutral-700 pt-3 md:pt-0 md:pl-4 min-w-[140px]">
                                {o.status === 'READY' && (
                                    <button
                                        onClick={() => handleShipOrder(o.id)}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded transition-colors"
                                    >
                                        Отгрузить
                                    </button>
                                )}
                                {o.status === 'SHIPPED' && (
                                    <div className="text-xs text-neutral-400 text-center">
                                        Отгрузил:<br /> <span className="text-white">{o.shippedBy?.fullName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- 3. SALARY REPORT TAB ---
function SalaryTab() {
    const [report, setReport] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await api.getSalaryReport({ startDate, endDate });
            setReport(data);
        } catch (e) {
            console.error('Failed to load salary report', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Отчет по выработке (Зарплата)</h2>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-neutral-700/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-neutral-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-neutral-700 border border-neutral-600 text-white text-sm rounded px-2 py-1 outline-none focus:border-blue-500"
                    />
                    <span className="text-neutral-400">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-neutral-700 border border-neutral-600 text-white text-sm rounded px-2 py-1 outline-none focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={loadReport}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Загрузка...' : 'Сформировать'}
                </button>
            </div>

            {report.length === 0 && !loading ? (
                <div className="text-neutral-400 text-sm text-center py-4">Нет данных за выбранный период</div>
            ) : (
                <div className="space-y-6">
                    {report.map(workerData => (
                        <div key={workerData.worker.id} className="border border-neutral-700 bg-neutral-800 rounded-lg overflow-hidden">
                            <div className="bg-neutral-700/50 px-4 py-3 flex flex-wrap justify-between items-center border-b border-neutral-700">
                                <div>
                                    <div className="font-bold text-white text-base">{workerData.worker.fullName}</div>
                                    <div className="text-xs text-neutral-400">{workerData.worker.department || 'Без отдела'}</div>
                                </div>
                                <div className="flex gap-4 mt-2 sm:mt-0 text-sm">
                                    <div className="text-center">
                                        <div className="text-neutral-400 text-xs uppercase">Сдано ОТК</div>
                                        <div className="text-white font-bold">{workerData.totalCompleted} шт</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-neutral-400 text-xs uppercase">Годные</div>
                                        <div className="text-green-400 font-bold">{workerData.totalAcceptedQA} шт</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-neutral-400 text-xs uppercase">Брак</div>
                                        <div className="text-red-400 font-bold">{workerData.totalRejectedQA} шт</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 overflow-x-auto">
                                <table className="w-full text-left text-sm text-neutral-300">
                                    <thead className="text-xs text-neutral-500 border-b border-neutral-700/50">
                                        <tr>
                                            <th className="pb-2 font-medium">Номенклатура</th>
                                            <th className="pb-2 font-medium">Партия</th>
                                            <th className="pb-2 font-medium">Дата сдачи</th>
                                            <th className="pb-2 font-medium text-right">Кол-во</th>
                                            <th className="pb-2 font-medium text-right text-green-400/80">Годные</th>
                                            <th className="pb-2 font-medium text-right text-red-400/80">Брак</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-700/30">
                                        {workerData.batches.map((b: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-neutral-700/10">
                                                <td className="py-2 text-white">{b.nomenclatureName}</td>
                                                <td className="py-2 text-neutral-400">{b.batchNumber}</td>
                                                <td className="py-2 text-neutral-400">{new Date(b.date).toLocaleDateString()}</td>
                                                <td className="py-2 text-right font-medium">{b.completedQuantity}</td>
                                                <td className="py-2 text-right text-green-400">{b.acceptedQty}</td>
                                                <td className="py-2 text-right text-red-400">{b.rejectedQty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
