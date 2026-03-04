import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PackageOpen, MapPin, Truck, Check } from 'lucide-react';

export default function StorekeeperDashboard() {
    const [activeTab, setActiveTab] = useState<'income' | 'picking'>('income');

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    Рабочее место Кладовщика
                </h1>

                {/* Tabs */}
                <div className="flex space-x-1 bg-neutral-800 p-1 rounded-lg shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'income' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                    >
                        <PackageOpen size={16} /> Приемка из ОТК
                    </button>
                    <button
                        onClick={() => setActiveTab('picking')}
                        className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'picking' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                    >
                        <Truck size={16} /> Сборка Отгрузок
                    </button>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl border border-neutral-700/50 p-6 shadow-sm min-h-[500px]">
                {activeTab === 'income' && <IncomeTab />}
                {activeTab === 'picking' && <PickingTab />}
            </div>
        </div>
    );
}

// --- 1. INCOME TAB (Раскладка из Буфера) ---
function IncomeTab() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [movingItem, setMovingItem] = useState<any>(null);
    const [newLocation, setNewLocation] = useState('');
    const [moveQty, setMoveQty] = useState<number>(0);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const data = await api.getWarehouseInventory();
            // Filter to show ONLY items in "Буфер ОТК"
            setInventory(data.filter((item: any) => item.location === 'Буфер ОТК'));
        } catch (e) {
            console.error('Failed to load inventory', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const handleMove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!movingItem) return;
        try {
            await api.moveWarehouseItem({
                itemId: movingItem.id,
                newLocation: newLocation,
                quantity: moveQty
            });
            setMovingItem(null);
            setNewLocation('');
            loadInventory(); // reload
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка перемещения');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Ожидают размещения (Буфер ОТК)</h2>
                <button onClick={loadInventory} className="text-sm bg-neutral-700 text-white px-3 py-1.5 rounded hover:bg-neutral-600">
                    Обновить
                </button>
            </div>

            {loading ? (
                <div className="text-neutral-400 text-sm">Загрузка...</div>
            ) : inventory.length === 0 ? (
                <div className="text-neutral-400 text-sm py-4 text-center">Буфер пуст. Все принятые изделия размещены.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        {inventory.map((item) => (
                            <div key={item.id} className="bg-neutral-700/30 border border-neutral-600 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-white mb-1">{item.nomenclature.name}</div>
                                    <div className="text-xs text-neutral-400">Партия: {item.batch?.batchNumber || 'Н/Д'}</div>
                                    <div className="font-medium text-blue-400 text-sm mt-1">Остаток: {item.quantity} шт.</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setMovingItem(item);
                                        setMoveQty(item.quantity);
                                        setNewLocation('');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm transition-colors"
                                >
                                    Разместить
                                </button>
                            </div>
                        ))}
                    </div>

                    {movingItem && (
                        <div className="bg-neutral-800 border border-blue-500/50 rounded-lg p-4 h-max sticky top-4">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-blue-400" /> Размещение: {movingItem.nomenclature.name}
                            </h3>
                            <form onSubmit={handleMove} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Количество для размещения (макс {movingItem.quantity})</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={movingItem.quantity}
                                        value={moveQty}
                                        onChange={e => setMoveQty(Number(e.target.value))}
                                        className="w-full bg-neutral-700 border border-neutral-600 outline-none text-white px-3 py-2 rounded text-sm focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Ячейка / Адрес (отсканируйте ШК или введите)</label>
                                    <input
                                        type="text"
                                        value={newLocation}
                                        onChange={e => setNewLocation(e.target.value)}
                                        placeholder="Напр., Р1-С2-П3"
                                        className="w-full bg-neutral-700 border border-neutral-600 outline-none text-white px-3 py-2 rounded text-sm focus:border-blue-500"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMovingItem(null)}
                                        className="px-4 py-2 rounded text-sm text-neutral-300 hover:text-white"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-500"
                                    >
                                        Подтвердить
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- 2. PICKING TAB (Сборка Отгрузок) ---
function PickingTab() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await api.getShippingOrders();
            // Storekeeper only sees NEW and GATHERING
            setOrders(data.filter((o: any) => o.status === 'NEW' || o.status === 'GATHERING'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const handlePick = async (itemId: number, maxRequired: number) => {
        const inputQty = prompt(`Сколько деталей вы собрали? (Требуется еще ${maxRequired})`, maxRequired.toString());
        if (!inputQty) return;
        const qty = parseInt(inputQty);
        if (isNaN(qty) || qty <= 0 || qty > maxRequired) {
            alert('Некорректное количество');
            return;
        }

        // We find the order that contains this item to get orderId
        const orderId = orders.find(o => o.items.some((i: any) => i.id === itemId))?.id;
        if (!orderId) return;

        try {
            await api.pickShippingItem(orderId, { itemId, pickedQty: qty });
            loadOrders(); // reload
        } catch (e: any) {
            alert(e.response?.data?.error || 'Ошибка сборки');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Задания на сборку от ТМЦ</h2>
                <button onClick={loadOrders} className="text-sm bg-neutral-700 text-white px-3 py-1.5 rounded hover:bg-neutral-600">
                    Обновить
                </button>
            </div>

            {loading ? (
                <div className="text-neutral-400 text-sm">Загрузка...</div>
            ) : orders.length === 0 ? (
                <div className="text-neutral-400 text-sm py-4 text-center">Нет активных заданий на отгрузку.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {orders.map(o => (
                        <div key={o.id} className="border border-neutral-600 bg-neutral-800/80 rounded-lg overflow-hidden flex flex-col">
                            <div className="bg-neutral-700/50 px-4 py-3 flex justify-between items-center">
                                <div>
                                    <h3 className="text-white font-bold text-base">Задание #{o.orderNumber}</h3>
                                    <div className="text-xs text-neutral-400">От: {o.createdBy?.fullName || 'ТМЦ'}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.status === 'GATHERING' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {o.status === 'GATHERING' ? 'В процессе сборки' : 'Новое'}
                                </span>
                            </div>

                            {o.notes && (
                                <div className="px-4 py-2 text-sm text-neutral-300 italic border-b border-neutral-700/50 bg-neutral-800">
                                    {o.notes}
                                </div>
                            )}

                            <div className="p-4 flex-1 space-y-3">
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Позиции к сборке</h4>

                                {o.items.map((item: any) => {
                                    const isComplete = item.pickedQty >= item.requiredQty;
                                    const needed = item.requiredQty - item.pickedQty;

                                    return (
                                        <div key={item.id} className={`p-3 rounded-lg border ${isComplete ? 'border-green-500/30 bg-green-500/5' : 'border-neutral-600 bg-neutral-700/30'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-bold text-white text-sm">{item.nomenclature.name}</div>
                                                    <div className="text-xs text-neutral-400 line-clamp-1">{item.nomenclature.description}</div>
                                                </div>
                                                {isComplete ? (
                                                    <div className="flex items-center gap-1 text-green-400 text-sm font-bold bg-green-500/10 px-2 py-1 rounded">
                                                        <Check size={16} /> Собран
                                                    </div>
                                                ) : (
                                                    <span className="text-orange-400 font-bold text-sm bg-orange-500/10 px-2 py-1 rounded">
                                                        Осталось собрать: {needed} шт
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-600/50">
                                                <div className="text-sm">
                                                    <span className="text-neutral-400 mr-2">Требуется Партия:</span>
                                                    <span className="text-white font-medium">{item.batch ? item.batch.batchNumber : 'Любая'}</span>
                                                </div>

                                                {!isComplete && (
                                                    <button
                                                        onClick={() => handlePick(item.id, needed)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded transition-colors"
                                                    >
                                                        Отметить сборку
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
