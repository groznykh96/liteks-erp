import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Database, Plus, Save, Trash2, Edit2, X, AlertCircle, Box, RefreshCcw } from 'lucide-react';
import { ELEMENTS } from '../utils/calculator';
import { DEFAULT_ALLOYS } from '../fallbackData';
import ConfirmModal from '../components/UI/ConfirmModal';

export default function References() {
    const [tab, setTab] = useState<'alloys' | 'materials' | 'nom'>('alloys');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-700 pb-4">
                <button onClick={() => setTab('alloys')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${tab === 'alloys' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                    <Database size={18} /> Реестр ГОСТов (Сплавы)
                </button>
                <button onClick={() => setTab('materials')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${tab === 'materials' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                    <BookOpen size={18} /> Справочник материалов
                </button>
                <button onClick={() => setTab('nom')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${tab === 'nom' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                    <Box size={18} /> Справочник отливок
                </button>
            </div>

            {tab === 'alloys' && <AlloysEditor />}
            {tab === 'materials' && <MaterialsEditor />}
            {tab === 'nom' && <NomenclatureEditor />}
        </div>
    );
}

// ======================= ALLOYS EDITOR =======================
function AlloysEditor() {
    const [alloys, setAlloys] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, title?: string, confirmText?: string }>({
        isOpen: false, message: '', onConfirm: () => { }
    });

    const load = async () => {
        try {
            const data = await api.getAlloys();

            // Sort to match order strictly as in GOST (DEFAULT_ALLOYS)
            const sortedData = data.sort((a: any, b: any) => {
                const aName = (a.name || '').trim().toLowerCase();
                const bName = (b.name || '').trim().toLowerCase();
                const aIndex = DEFAULT_ALLOYS.findIndex(da => da.name.trim().toLowerCase() === aName);
                const bIndex = DEFAULT_ALLOYS.findIndex(da => da.name.trim().toLowerCase() === bName);

                // Both custom: sort alphabetically
                if (aIndex === -1 && bIndex === -1) return aName.localeCompare(bName);
                // a is custom, push down
                if (aIndex === -1) return 1;
                // b is custom, push down
                if (bIndex === -1) return -1;

                // Both are GOST: sort by GOST order
                return aIndex - bIndex;
            });

            setAlloys(sortedData);
        } catch (e) {
            console.error('Ошибка загрузки сплавов', e);
        }
    };
    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        // Use timestamp-based unique name to avoid @unique constraint failure
        const uniqueName = `НОВАЯ МАРКА ${Date.now()}`;
        const item: any = { name: uniqueName };
        ELEMENTS.forEach(el => { item[`${el}_min`] = 0; item[`${el}_max`] = 0; });
        try {
            setSaving(true);
            await api.saveAlloy(item);
            await load();
        } catch (e: any) {
            alert('Ошибка при добавлении марки: ' + (e?.response?.data?.error || e?.message || 'Неизвестная ошибка'));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (a: any, idx: number) => {
        setEditingIdx(idx);
        setEditForm({ ...a });
    };

    const handleSave = async () => {
        if (!editForm.name?.trim()) return alert('Имя не может быть пустым');
        try {
            setSaving(true);
            await api.saveAlloy(editForm);
            setEditingIdx(null);
            await load();
        } catch (e: any) {
            alert('Ошибка при сохранении: ' + (e?.response?.data?.error || e?.message || 'Неизвестная ошибка'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setConfirmState({
            isOpen: true,
            title: 'Удаление сплава',
            message: 'Удалить эту марку сплава? (Внимание: она может использоваться в Журнале плавок!)',
            confirmText: 'Удалить',
            onConfirm: async () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                try {
                    setSaving(true);
                    await api.deleteAlloy(id);
                    await load();
                } catch (e: any) {
                    alert('Ошибка при удалении: ' + (e?.response?.data?.error || e?.message || 'Неизвестная ошибка'));
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    // Accepts current row data directly to avoid stale state issues
    const applyGostValues = (currentRow: any) => {
        const name = (currentRow.name || '').trim().toLowerCase();
        const gostAlloy: any = DEFAULT_ALLOYS.find(
            a => a.name.trim().toLowerCase() === name
        );
        if (!gostAlloy) {
            alert('Для марки "' + currentRow.name + '" нет данных в ГОСТ справочнике.\nСброс недоступен для нестандартных марок.');
            return;
        }

        setConfirmState({
            isOpen: true,
            title: 'Сброс значений',
            message: `Сбросить состав "${currentRow.name}" до значений ГОСТ?`,
            confirmText: 'Сбросить',
            onConfirm: () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                const resetForm = { ...currentRow };
                ELEMENTS.forEach(el => {
                    const minKey = `${el}_min`;
                    const maxKey = `${el}_max`;
                    if (gostAlloy[minKey] !== undefined) {
                        resetForm[minKey] = gostAlloy[minKey];
                    }
                    if (gostAlloy[maxKey] !== undefined) {
                        resetForm[maxKey] = gostAlloy[maxKey];
                    }
                });
                setEditForm(resetForm);
                // Find the index of this alloy in the current loaded list and enter edit mode
                const idx = alloys.findIndex(a => a.id === currentRow.id);
                setEditingIdx(idx >= 0 ? idx : editingIdx);
            }
        });
    };

    const resetAllToGost = async () => {
        setConfirmState({
            isOpen: true,
            title: 'Массовый сброс',
            message: 'ВНИМАНИЕ! Это действие сбросит химический состав ВСЕХ марок сплавов в этом списке к стандартным значениям ГОСТ.\n\nВы уверены, что хотите продолжить?',
            confirmText: 'Сбросить все',
            onConfirm: async () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                try {
                    setSaving(true);
                    const updates = alloys.map(current => {
                        const name = (current.name || '').trim().toLowerCase();
                        const gostAlloy = DEFAULT_ALLOYS.find(a => a.name.trim().toLowerCase() === name);

                        if (!gostAlloy) return current;

                        const updated = { ...current };
                        ELEMENTS.forEach(el => {
                            const minKey = `${el}_min`;
                            const maxKey = `${el}_max`;
                            if ((gostAlloy as any)[minKey] !== undefined) updated[minKey] = (gostAlloy as any)[minKey];
                            if ((gostAlloy as any)[maxKey] !== undefined) updated[maxKey] = (gostAlloy as any)[maxKey];
                        });
                        return updated;
                    });

                    for (const alloy of updates) {
                        await api.saveAlloy(alloy);
                    }

                    await load();
                    alert('Сброс всех известных марок к значениям ГОСТ успешно завершён.');
                } catch (e: any) {
                    alert('Ошибка при сбросе: ' + (e?.response?.data?.error || e?.message || 'Неизвестная ошибка'));
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    return (
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database size={18} className="text-indigo-500" /> Справочник сплавов (ГОСТ)
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={resetAllToGost}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-bold transition-all shadow-md active:scale-95 text-sm disabled:opacity-50 border border-neutral-600"
                        title="Вернуть все стандартные марки к заводским настройкам (ГОСТ)"
                    >
                        <RefreshCcw size={16} className={saving ? 'animate-spin' : ''} /> СБРОСИТЬ ВСЕ К ГОСТ
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 text-sm disabled:opacity-50"
                    >
                        <Plus size={16} /> ДОБАВИТЬ МАРКУ
                    </button>
                </div>
            </div>

            <div className="p-4 bg-yellow-900/20 border-b border-yellow-500/20 text-yellow-500 flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> Максимальные значения (Ni, S, P, Cu) заполнять обязательно, минимальные оставить пустыми (0).
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-neutral-950/40 text-neutral-400">
                        <tr>
                            <th className="p-3 text-left w-32 font-semibold uppercase">Название</th>
                            {ELEMENTS.map(el => (
                                <th key={el} className="p-2 border-l border-neutral-700/50">
                                    <div className="font-bold text-neutral-300">{el}</div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px] mt-1 text-neutral-500 font-mono">
                                        <span>MIN</span><span>MAX</span>
                                    </div>
                                </th>
                            ))}
                            <th className="p-3">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-700">
                        {alloys.length === 0 && <tr><td colSpan={ELEMENTS.length + 2} className="p-4 text-neutral-500">Справочник пуст</td></tr>}
                        {alloys.map((a, i) => {
                            const isEd = editingIdx === i;

                            return (
                                <tr key={a.id} className={`${isEd ? 'bg-neutral-700/50' : 'hover:bg-neutral-700/30'}`}>
                                    <td className="p-2 text-left">
                                        {isEd
                                            ? <input className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-white font-bold" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                            : <span className="font-bold text-indigo-300">{a.name}</span>
                                        }
                                    </td>

                                    {ELEMENTS.map(el => {
                                        const minKey = `${el}_min`;
                                        const maxKey = `${el}_max`;
                                        return (
                                            <td key={el} className="p-2 border-l border-neutral-700/50">
                                                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                                                    {isEd ? (
                                                        <>
                                                            <input type="number" step="0.01" className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-center text-white" value={editForm[minKey] ?? 0} onChange={e => setEditForm({ ...editForm, [minKey]: Number(e.target.value) })} />
                                                            <input type="number" step="0.01" className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-center text-white" value={editForm[maxKey] ?? 0} onChange={e => setEditForm({ ...editForm, [maxKey]: Number(e.target.value) })} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-neutral-400">{a[minKey] != null ? a[minKey].toFixed(2) : '-'}</span>
                                                            <span className="text-green-400 font-medium">{a[maxKey] != null ? a[maxKey].toFixed(2) : '-'}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}

                                    <td className="p-2">
                                        <div className="flex gap-1.5 justify-center">
                                            {isEd ? (
                                                <>
                                                    <button onClick={() => applyGostValues(editForm)} title="Сбросить до ГОСТ" className="bg-blue-700 p-1.5 rounded hover:bg-blue-600 text-white"><RefreshCcw size={15} /></button>
                                                    <button onClick={handleSave} disabled={saving} title="Сохранить" className="bg-green-600 p-1.5 rounded hover:bg-green-500 text-white disabled:opacity-50"><Save size={15} /></button>
                                                    <button onClick={() => setEditingIdx(null)} title="Отмена" className="bg-neutral-600 p-1.5 rounded hover:bg-neutral-500 text-white"><X size={15} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEdit(a, i)} title="Редактировать" className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-blue-400"><Edit2 size={15} /></button>
                                                    <button onClick={() => applyGostValues(a)} title="Сбросить до ГОСТ (откроет редактор)" className="p-1.5 rounded bg-neutral-700 hover:bg-blue-700 text-blue-300"><RefreshCcw size={15} /></button>
                                                    <button onClick={() => handleDelete(a.id)} title="Удалить" disabled={saving} className="p-1.5 rounded bg-neutral-700 hover:bg-red-900/50 text-red-500 disabled:opacity-50"><Trash2 size={15} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}

// ======================= MATERIALS EDITOR =======================
function MaterialsEditor() {
    const [materials, setMaterials] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, title?: string, confirmText?: string }>({
        isOpen: false, message: '', onConfirm: () => { }
    });

    const load = async () => setMaterials(await api.getMaterials());
    useEffect(() => { load(); }, []);

    const handleAdd = () => {
        const item: any = { name: 'НОВЫЙ МАТЕРИАЛ', price: 0, assimilation: 100 };
        ELEMENTS.forEach(el => item[el] = 0);
        if (api.saveMaterial) api.saveMaterial(item).then(load);
    };

    const handleEdit = (m: any, idx: number) => {
        setEditingIdx(idx);
        setEditForm({ ...m });
    };

    const handleSave = async () => {
        if (!editForm.name.trim()) return alert('Имя не может быть пустым');
        if (api.saveMaterial) await api.saveMaterial(editForm);
        setEditingIdx(null);
        load();
    };

    const handleDelete = async (id: number) => {
        setConfirmState({
            isOpen: true,
            title: 'Удаление материала',
            message: 'Удалить этот материал?',
            confirmText: 'Удалить',
            onConfirm: async () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                if (api.deleteMaterial) await api.deleteMaterial(id);
                load();
            }
        });
    };

    return (
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-500" /> Справочник шихтовых материалов
                </h3>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 text-sm rounded">
                    <Plus size={16} /> ДОБАВИТЬ МАТЕРИАЛ
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-neutral-950/40 text-neutral-400">
                        <tr>
                            <th className="p-3 text-left font-semibold uppercase">Наименование</th>
                            {ELEMENTS.map(el => <th key={el} className="p-3 font-semibold uppercase text-xs">{el}, %</th>)}
                            <th className="p-3 font-semibold uppercase">Цена, ₽</th>
                            <th className="p-3 font-semibold uppercase">Усвоение, %</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-700">
                        {materials.length === 0 && <tr><td colSpan={ELEMENTS.length + 4} className="p-4 text-neutral-500">Справочник пуст</td></tr>}
                        {materials.map((m, i) => {
                            const isEd = editingIdx === i;

                            return (
                                <tr key={m.id} className={`${isEd ? 'bg-neutral-700/50' : 'hover:bg-neutral-700/30'}`}>
                                    <td className="p-2 text-left">
                                        {isEd ? <input className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-white font-bold" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /> : <span className="font-bold text-neutral-200">{m.name}</span>}
                                    </td>

                                    {ELEMENTS.map(el => (
                                        <td key={el} className="p-2 font-mono text-xs">
                                            {isEd ?
                                                <input type="number" step="0.01" className="w-16 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-center text-white" value={editForm[el]} onChange={e => setEditForm({ ...editForm, [el]: Number(e.target.value) })} />
                                                :
                                                <span className={m[el] > 0 ? 'text-green-400' : 'text-neutral-500'}>{m[el] > 0 ? Number(m[el]).toFixed(2) : '-'}</span>
                                            }
                                        </td>
                                    ))}

                                    <td className="p-2 font-mono">
                                        {isEd ? <input type="number" className="w-20 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-center text-white" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} /> : <span className="font-bold text-yellow-400">{m.price}</span>}
                                    </td>

                                    <td className="p-2 font-mono">
                                        {isEd ? <input type="number" className="w-16 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-center text-white" value={editForm.assimilation} onChange={e => setEditForm({ ...editForm, assimilation: Number(e.target.value) })} /> : <span className="text-blue-300">{m.assimilation !== undefined ? m.assimilation : 100}</span>}
                                    </td>

                                    <td className="p-2 flex gap-2 justify-center">
                                        {isEd ? (
                                            <>
                                                <button onClick={handleSave} className="bg-green-600 p-1.5 rounded hover:bg-green-500 text-white"><Save size={16} /></button>
                                                <button onClick={() => setEditingIdx(null)} className="bg-neutral-600 p-1.5 rounded hover:bg-neutral-500 text-white"><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(m, i)} className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-blue-400"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded bg-neutral-700 hover:bg-red-900/50 text-red-500"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}

// ======================= NOMENCLATURE EDITOR =======================
function NomenclatureEditor() {
    const { user } = useAuth();
    const canEdit = user?.role === 'TECHNOLOGIST' || user?.role === 'MASTER' || user?.role === 'DIRECTOR' || user?.role === 'ADMIN';

    const [nom, setNom] = useState<any[]>([]);
    const [melts, setMelts] = useState<any[]>([]);
    const [methods, setMethods] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, title?: string, confirmText?: string }>({
        isOpen: false, message: '', onConfirm: () => { }
    });

    const load = async () => {
        setNom(await api.getNomenclature());
        setMelts(await api.getMelts());
        if (api.getMethods) {
            setMethods(await api.getMethods());
        }
    };

    useEffect(() => { load(); }, []);

    const handleEdit = (n: any, idx: number) => {
        if (!canEdit) return;
        setEditingIdx(idx);
        setEditForm({ ...n });
    };

    const handleSave = async () => {
        if (!canEdit) return;
        if (api.saveNomenclature) await api.saveNomenclature(editForm);
        setEditingIdx(null);
        load();
    };

    const handleDelete = async (id: number) => {
        if (!canEdit) return;
        const isUsed = melts.some(m => (m.castings || []).some((c: any) => c.nomId === id));
        if (isUsed) return alert('Деталь уже используется в реестре плавок, удаление запрещено!');

        setConfirmState({
            isOpen: true,
            title: 'Удаление детали',
            message: 'Удалить эту позицию справочника?',
            confirmText: 'Удалить',
            onConfirm: async () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                if (api.deleteNomenclature) await api.deleteNomenclature(id);
                load();
            }
        });
    };

    const handleAddNew = () => {
        if (!canEdit) return;
        const item = { code: 'НОВЫЙ', name: 'Название', group_name: '', exitMass: 1, goodMass: 1, tvgNorm: 100, note: '', castingMethodId: null };
        if (api.saveNomenclature) {
            api.saveNomenclature(item).then(load);
        }
    };

    return (
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Box size={18} className="text-purple-500" /> Справочник отливок (Номенклатура)
                </h3>
                {canEdit && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 text-sm rounded">
                        <Plus size={16} /> ДОБАВИТЬ ДЕТАЛЬ
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-neutral-950/40 text-neutral-400">
                        <tr>
                            <th className="px-4 py-3 text-left">Код</th>
                            <th className="px-4 py-3 text-left">Наименование</th>
                            <th className="px-4 py-3">Метод литья</th>
                            <th className="px-4 py-3">Выход, кг</th>
                            <th className="px-4 py-3">Годное, кг</th>
                            <th className="px-4 py-3">ТВГ норм, %</th>
                            {canEdit && <th className="px-4 py-3">Действия</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-700">
                        {nom.length === 0 && <tr><td colSpan={canEdit ? 7 : 6} className="py-6 text-neutral-500">Справочник пуст</td></tr>}
                        {nom.map((n, i) => {
                            if (editingIdx === i && canEdit) {
                                return (
                                    <tr key={n.id} className="bg-neutral-700/50">
                                        <td className="p-2"><input className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-white" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} /></td>
                                        <td className="p-2"><input className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-white" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                        <td className="p-2">
                                            <select
                                                className="w-full bg-neutral-900 border border-neutral-600 rounded p-1 text-white"
                                                value={editForm.castingMethodId || ''}
                                                onChange={e => setEditForm({ ...editForm, castingMethodId: e.target.value ? Number(e.target.value) : null })}
                                            >
                                                <option value="">Не выбран</option>
                                                {methods.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" step="0.1" className="w-20 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-white text-center" value={editForm.exitMass} onChange={e => setEditForm({ ...editForm, exitMass: Number(e.target.value) })} /></td>
                                        <td className="p-2"><input type="number" step="0.1" className="w-20 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-white text-center" value={editForm.goodMass} onChange={e => setEditForm({ ...editForm, goodMass: Number(e.target.value) })} /></td>
                                        <td className="p-2"><input type="number" step="0.1" className="w-20 mx-auto bg-neutral-900 border border-neutral-600 rounded p-1 text-white text-center" value={editForm.tvgNorm} onChange={e => setEditForm({ ...editForm, tvgNorm: Number(e.target.value) })} /></td>
                                        <td className="p-2 flex justify-center gap-2">
                                            <button onClick={handleSave} className="bg-green-600 p-1.5 rounded hover:bg-green-500 text-white"><Save size={16} /></button>
                                            <button onClick={() => setEditingIdx(null)} className="bg-neutral-600 p-1.5 rounded hover:bg-neutral-500 text-white"><X size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={n.id} className="hover:bg-neutral-700/30">
                                    <td className="p-3 text-left font-bold text-white">{n.code}</td>
                                    <td className="p-3 text-left text-neutral-300">{n.name}</td>
                                    <td className="p-3 text-blue-300">
                                        {n.castingMethod?.name || <span className="text-neutral-500 text-xs italic">Не задан</span>}
                                    </td>
                                    <td className="p-3 font-mono">{n.exitMass}</td>
                                    <td className="p-3 font-mono text-green-400">{n.goodMass}</td>
                                    <td className="p-3 font-mono text-yellow-500">{n.tvgNorm}%</td>
                                    {canEdit && (
                                        <td className="p-3 flex justify-center gap-2">
                                            <button onClick={() => handleEdit(n, i)} className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-blue-400"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded bg-neutral-700 hover:bg-red-900/50 text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
