import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, List as ListIcon, FileSpreadsheet, Eye, Trash2, Save as SaveIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Ledger() {
    const [subTab, setSubTab] = useState<'new' | 'registry' | 'details'>('registry');

    const [melts, setMelts] = useState<any[]>([]);
    const [nom, setNom] = useState<any[]>([]);
    const [alloys, setAlloys] = useState<any[]>([]);

    const [viewingMeltId, setViewingMeltId] = useState<number | null>(null);

    const load = async () => {
        setMelts(await api.getMelts());
        setNom(await api.getNomenclature());
        setAlloys(await api.getAlloys());
    };

    useEffect(() => { load(); }, [subTab]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-700 pb-4">
                <button onClick={() => setSubTab('new')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${subTab === 'new' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                    <Plus size={18} /> Новая плавка
                </button>
                <button onClick={() => setSubTab('registry')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${subTab === 'registry' || subTab === 'details' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                    <ListIcon size={18} /> Реестр плавок
                </button>
            </div>

            {subTab === 'new' && <NewMeltView nom={nom} alloys={alloys} onDone={() => { load(); setSubTab('registry'); }} />}
            {subTab === 'registry' && <RegistryView melts={melts} alloys={alloys} nom={nom} onView={id => { setViewingMeltId(id); setSubTab('details'); }} onReload={load} />}
            {subTab === 'details' && viewingMeltId && <MeltDetailsView melt={melts.find(m => m.id === viewingMeltId)} alloys={alloys} nom={nom} onBack={() => setSubTab('registry')} />}
        </div>
    );
}

// ============================ REGISTRY VIEW ============================
function RegistryView({ melts, alloys, nom, onView, onReload }: { melts: any[], alloys: any[], nom: any[], onView: (id: number) => void, onReload: () => void }) {

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить эту плавку?')) return;
        if (api.deleteMelt) await api.deleteMelt(id);
        onReload();
    };

    const handleExportExcel = () => {
        const data = melts.map(m => {
            const alloy = alloys.find(a => a.id === m.alloyId) || { name: 'Неизв.' };
            let goodMass = 0;
            let castStrArr: string[] = [];

            (m.castings || []).forEach((c: any) => {
                goodMass += parseFloat(c.goodMassFact) || 0;
                const item = nom.find(n => n.id === c.nomId);
                if (item) castStrArr.push(`${item.code} (${c.qty} шт)`);
            });

            const yieldPct = m.meltMass > 0 ? (goodMass / m.meltMass) * 100 : 0;
            const costKg = goodMass > 0 ? m.totalCost / goodMass : 0;

            return {
                "Номер плавки": m.meltNumber,
                "Дата": new Date(m.date).toLocaleDateString('ru-RU'),
                "Марка сплава": alloy.name,
                "Завалка, кг": Number(m.meltMass),
                "Годное, кг": Number(goodMass.toFixed(2)),
                "Выход, %": Number(yieldPct.toFixed(2)),
                "Стоимость, ₽": Number(m.totalCost.toFixed(2)),
                "Себестоимость, ₽/кг": Number(costKg.toFixed(2)),
                "Отлитые детали": castStrArr.join(', ')
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Реестр плавок");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "Реестр_плавок.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListIcon size={18} className="text-blue-500" /> Реестр произведенных плавок
                </h3>
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-md active:scale-95 text-sm">
                    <FileSpreadsheet size={16} /> ЭКСПОРТ В EXCEL
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center whitespace-nowrap">
                    <thead className="bg-neutral-950/40 text-neutral-400">
                        <tr>
                            <th className="px-4 py-3 font-semibold uppercase">Номер</th>
                            <th className="px-4 py-3 font-semibold uppercase">Дата</th>
                            <th className="px-4 py-3 font-semibold uppercase">Сплав</th>
                            <th className="px-4 py-3 font-semibold uppercase">Завалка, кг</th>
                            <th className="px-4 py-3 font-semibold uppercase">Годное, кг</th>
                            <th className="px-4 py-3 font-semibold uppercase">Выход, %</th>
                            <th className="px-4 py-3 font-semibold uppercase">Себест. ₽/кг</th>
                            <th className="px-4 py-3 font-semibold uppercase">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-700/50">
                        {melts.length === 0 && <tr><td colSpan={8} className="py-6 text-neutral-500 italic">Журнал плавок пуст.</td></tr>}
                        {melts.map(m => {
                            const alloy = alloys.find(a => a.id === m.alloyId) || { name: 'Неизв.' };
                            let goodMass = 0;
                            (m.castings || []).forEach((c: any) => { goodMass += parseFloat(c.goodMassFact) || 0; });
                            const yieldPct = m.meltMass > 0 ? (goodMass / m.meltMass) * 100 : 0;
                            const costKg = goodMass > 0 ? m.totalCost / goodMass : 0;

                            return (
                                <tr key={m.id} className="hover:bg-neutral-700/30 transition-colors">
                                    <td className="px-4 py-3 font-bold text-white">{m.meltNumber}</td>
                                    <td className="px-4 py-3 text-neutral-300">{new Date(m.date).toLocaleDateString('ru-RU')}</td>
                                    <td className="px-4 py-3 text-blue-300">{alloy.name}</td>
                                    <td className="px-4 py-3 font-mono">{m.meltMass}</td>
                                    <td className="px-4 py-3 font-mono text-green-400">{goodMass.toFixed(1)}</td>
                                    <td className="px-4 py-3 font-mono text-yellow-500">{yieldPct.toFixed(1)}%</td>
                                    <td className="px-4 py-3 font-mono font-bold">{costKg.toFixed(2)}</td>
                                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                                        <button onClick={() => onView(m.id)} className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-blue-400 transition" title="Детали"><Eye size={16} /></button>
                                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded bg-neutral-700 hover:bg-red-900/50 text-red-500 transition" title="Удалить"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================ NEW MELT VIEW ============================
function NewMeltView({ nom, alloys, onDone }: { nom: any[], alloys: any[], onDone: () => void }) {
    const [meltNum, setMeltNum] = useState(`ПЛ-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [alloyId, setAlloyId] = useState(alloys[0]?.id || 0);
    const [totalCost, setTotalCost] = useState(0);
    const [meltMass, setMeltMass] = useState(1000);
    const [note, setNote] = useState('');

    const [castings, setCastings] = useState<any[]>([]);

    const [addNomId, setAddNomId] = useState(nom[0]?.id || 0);
    const [addQty, setAddQty] = useState(1);

    useEffect(() => {
        if (!alloyId && alloys.length > 0) setAlloyId(alloys[0].id);
        if (!addNomId && nom.length > 0) setAddNomId(nom[0].id);
    }, [nom, alloys]);

    const handleAdd = () => {
        if (!addNomId) return;
        setCastings([...castings, {
            nomId: addNomId, qty: addQty, exitMassFact: '', goodMassFact: '', profitRestFact: '', tvgFact: '', note: ''
        }]);
    };

    const updateC = (idx: number, field: string, val: any) => {
        const c = [...castings];
        c[idx][field] = val;

        // auto calc profit rest
        if (field === 'exitMassFact' || field === 'goodMassFact') {
            const e = parseFloat(c[idx].exitMassFact) || 0;
            const g = parseFloat(c[idx].goodMassFact) || 0;
            if (e > 0 && g > 0) c[idx].profitRestFact = (e - g).toFixed(1);
        }
        setCastings(c);
    };

    const fillNorm = (idx: number) => {
        const c = [...castings];
        const item = nom.find(n => n.id === c[idx].nomId);
        if (item) {
            c[idx].exitMassFact = item.exitMass ? (item.exitMass * c[idx].qty).toFixed(1) : '';
            c[idx].goodMassFact = item.goodMass ? (item.goodMass * c[idx].qty).toFixed(1) : '';
            c[idx].tvgFact = item.tvgNorm || '';
            const e = parseFloat(c[idx].exitMassFact) || 0;
            const g = parseFloat(c[idx].goodMassFact) || 0;
            if (e > 0 && g > 0) c[idx].profitRestFact = (e - g).toFixed(1);
        }
        setCastings(c);
    };

    const handleSave = async () => {
        if (!meltNum.trim()) return alert('Укажите номер плавки');

        let sumExit = 0;
        castings.forEach(c => sumExit += parseFloat(c.exitMassFact) || 0);
        if (sumExit > meltMass && !confirm('Внимание! Суммарная масса выхода деталей больше массы завалки. Сохранить все равно?')) return;

        const melt = {
            meltNumber: meltNum.trim(),
            date, alloyId, totalCost, meltMass, note,
            castings
        };

        if (api.saveMelt) await api.saveMelt(melt);
        alert('Плавка сохранена!');
        onDone();
    };

    let sumExit = 0, sumGood = 0;
    castings.forEach(c => {
        sumExit += parseFloat(c.exitMassFact) || 0;
        sumGood += parseFloat(c.goodMassFact) || 0;
    });

    return (
        <div className="space-y-6">
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <Plus size={18} className="text-blue-500" /> Регистрация новой плавки
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Номер плавки</label>
                        <input className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={meltNum} onChange={e => setMeltNum(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Дата</label>
                        <input type="date" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Сплав</label>
                        <select className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={alloyId} onChange={e => setAlloyId(Number(e.target.value))}>
                            {alloys.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Вес завалки, кг</label>
                        <input type="number" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={meltMass} onChange={e => setMeltMass(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1">Стоимость, ₽</label>
                        <input type="number" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={totalCost} onChange={e => setTotalCost(Number(e.target.value))} />
                    </div>
                    <div className="xl:col-span-1">
                        <label className="block text-xs text-neutral-400 mb-1">Примечание</label>
                        <input className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg">
                <div className="flex items-end gap-4 mb-4 pb-4 border-b border-neutral-700">
                    <div className="flex-1 max-w-md">
                        <label className="block text-xs text-neutral-400 mb-1">Добавить деталь в плавку</label>
                        <select className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={addNomId} onChange={e => setAddNomId(Number(e.target.value))}>
                            {nom.map(n => <option key={n.id} value={n.id}>{n.code} — {n.name}</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="block text-xs text-neutral-400 mb-1">Кол-во</label>
                        <input type="number" min="1" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" value={addQty} onChange={e => setAddQty(Number(e.target.value))} />
                    </div>
                    <button onClick={handleAdd} className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 text-sm h-10">
                        <Plus size={16} /> ДОБАВИТЬ
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center whitespace-nowrap">
                        <thead className="bg-neutral-900/50 text-neutral-400 text-xs uppercase">
                            <tr>
                                <th className="p-2 text-left">Деталь</th>
                                <th className="p-2">Кол-во</th>
                                <th className="p-2">Масса выхода факт</th>
                                <th className="p-2">Масса годного факт</th>
                                <th className="p-2">ТВГ факт, %</th>
                                <th className="p-2">Примечание</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-700">
                            {castings.length === 0 && <tr><td colSpan={7} className="py-4 text-neutral-500">Нет деталей в плавке</td></tr>}
                            {castings.map((c, i) => {
                                const item = nom.find(n => n.id === c.nomId);
                                return (
                                    <tr key={i} className="hover:bg-neutral-700/30">
                                        <td className="p-2 text-left font-bold text-white leading-tight">
                                            {item?.code}<br /><span className="text-xs font-normal text-neutral-500">{item?.name}</span>
                                        </td>
                                        <td className="p-2"><input type="number" min="1" value={c.qty} onChange={e => updateC(i, 'qty', parseInt(e.target.value))} className="w-16 bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-white" /></td>
                                        <td className="p-2">
                                            <input type="number" step="0.1" value={c.exitMassFact} onChange={e => updateC(i, 'exitMassFact', e.target.value)} className="w-20 bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-white" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" step="0.1" value={c.goodMassFact} onChange={e => updateC(i, 'goodMassFact', e.target.value)} className="w-20 bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-white" />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-col items-center gap-1">
                                                <input type="number" step="0.1" value={c.tvgFact} onChange={e => updateC(i, 'tvgFact', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-white" />
                                                <button onClick={() => fillNorm(i)} className="text-[10px] bg-neutral-700 px-2 rounded hover:bg-neutral-600 transition">Заполнить по норме</button>
                                            </div>
                                        </td>
                                        <td className="p-2"><input type="text" value={c.note} onChange={e => updateC(i, 'note', e.target.value)} className="w-32 bg-neutral-900 border border-neutral-700 rounded p-1 text-white" /></td>
                                        <td className="p-2">
                                            <button onClick={() => setCastings(castings.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 transition"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl border-l-4 border-blue-500 p-5 shadow-lg flex items-center justify-between">
                <div className="flex gap-8">
                    <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-wider">Итого выход</div>
                        <div className="text-xl font-bold text-white">{sumExit.toFixed(1)} <span className="text-sm font-normal text-neutral-500">кг</span></div>
                    </div>
                    <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-wider">Итого годное</div>
                        <div className="text-xl font-bold text-green-400">{sumGood.toFixed(1)} <span className="text-sm font-normal text-neutral-500">кг</span></div>
                    </div>
                    <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-wider">Общий ТВГ</div>
                        <div className="text-xl font-bold text-yellow-500">{meltMass > 0 ? ((sumGood / meltMass) * 100).toFixed(1) : '0'} <span className="text-sm font-normal text-neutral-500">%</span></div>
                    </div>
                    <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-wider">Себест. 1 кг</div>
                        <div className="text-xl font-bold text-red-400">{sumGood > 0 ? (totalCost / sumGood).toFixed(2) : '0'} <span className="text-sm font-normal text-neutral-500">₽</span></div>
                    </div>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition active:scale-95">
                    <SaveIcon size={20} /> СОХРАНИТЬ ПЛАВКУ
                </button>
            </div>
        </div>
    );
}

// ============================DETAILS VIEW============================
function MeltDetailsView({ melt, alloys, nom, onBack }: { melt: any, alloys: any[], nom: any[], onBack: () => void }) {
    const { user } = useAuth();
    const [chemStatus, setChemStatus] = useState(melt?.conclusion?.chemistryStatus || 'В норме');
    const [mechStatus, setMechStatus] = useState(melt?.conclusion?.mechanicalStatus || 'В норме');
    const [finalVerdict, setFinalVerdict] = useState(melt?.conclusion?.finalVerdict || 'Годна');
    const [comments, setComments] = useState(melt?.conclusion?.comments || '');

    if (!melt) return <div />;

    const handleSaveConclusion = async () => {
        try {
            await api.saveMeltConclusion(melt.id, {
                chemistryStatus: chemStatus,
                mechanicalStatus: mechStatus,
                finalVerdict,
                comments
            });
            alert('Заключение успешно сохранено!');
            onBack();
        } catch (e) {
            alert('Ошибка сохранения заключения');
        }
    };

    // Exact same math as NewMeltView
    let sumExit = 0, sumGood = 0;
    (melt.castings || []).forEach((c: any) => {
        sumExit += parseFloat(c.exitMassFact) || 0;
        sumGood += parseFloat(c.goodMassFact) || 0;
    });

    const alloy = alloys.find(a => a.id === melt.alloyId) || { name: 'Неизв.' };

    const handleExportDetails = () => {
        const data = (melt.castings || []).map((c: any) => {
            const item = nom.find(n => n.id === c.nomId) || { code: '?', name: '?' };
            return {
                "Код": item.code,
                "Наименование": item.name,
                "Кол-во": Number(c.qty),
                "Масса выхода (факт)": Number(c.exitMassFact || 0),
                "Масса годного (факт)": Number(c.goodMassFact || 0),
                "ТВГ (факт) %": Number(c.tvgFact || 0),
                "Примечание": c.note || ""
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Детализация");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Плавка_${melt.meltNumber}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Детализация плавки <span className="text-blue-400">{melt.meltNumber}</span>
                </h3>
                <div className="flex gap-2">
                    <button onClick={handleExportDetails} className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold transition text-sm">
                        <FileSpreadsheet size={16} /> ЭКСПОРТ EXCEL
                    </button>
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition text-sm">
                        НАЗАД
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 bg-neutral-900/50 p-4 rounded-lg">
                <div><div className="text-neutral-500 text-xs uppercase">Дата</div><div className="font-bold text-lg">{new Date(melt.date).toLocaleDateString('ru-RU')}</div></div>
                <div><div className="text-neutral-500 text-xs uppercase">Сплав</div><div className="font-bold text-blue-400 text-lg">{alloy.name}</div></div>
                <div><div className="text-neutral-500 text-xs uppercase">Завалка</div><div className="font-bold text-lg">{melt.meltMass} кг</div></div>
                <div><div className="text-neutral-500 text-xs uppercase">Стоимость</div><div className="font-bold text-red-400 text-lg">{melt.totalCost} ₽</div></div>
            </div>

            {melt.note && <div className="p-3 bg-neutral-700/30 border-l-4 border-blue-500 text-neutral-300">{melt.note}</div>}

            <table className="w-full text-sm text-center">
                <thead className="bg-neutral-900 text-neutral-400">
                    <tr>
                        <th className="p-2 text-left">Деталь</th>
                        <th className="p-2">Кол-во</th>
                        <th className="p-2">Масса выхода</th>
                        <th className="p-2">Годное</th>
                        <th className="p-2">ТВГ %</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700">
                    {(melt.castings || []).map((c: any, i: number) => {
                        const item = nom.find(n => n.id === c.nomId);
                        return (
                            <tr key={i} className="hover:bg-neutral-700/30">
                                <td className="p-2 text-left font-bold">{item?.code} <span className="font-normal text-neutral-400 ml-2">{item?.name}</span></td>
                                <td className="p-2">{c.qty}</td>
                                <td className="p-2">{c.exitMassFact}</td>
                                <td className="p-2 text-green-400">{c.goodMassFact}</td>
                                <td className="p-2">{c.tvgFact}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ЗАКЛЮЧЕНИЕ / ВЕРДИКТ */}
            <div className="bg-neutral-900 border border-neutral-700/50 p-5 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-4 border-b border-neutral-700 pb-2">Заключение по плавке (ОТК / Технолог)</h4>

                {melt.conclusion && (user?.role === 'WORKER') ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-neutral-400">Химия:</span> <span className="font-bold text-white">{melt.conclusion.chemistryStatus}</span>
                        </div>
                        <div>
                            <span className="text-sm text-neutral-400">Механика:</span> <span className="font-bold text-white">{melt.conclusion.mechanicalStatus}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-sm text-neutral-400">Вердикт:</span>
                            <span className={`font-bold ml-2 px-2 py-1 rounded text-sm ${melt.conclusion.finalVerdict === 'Годна' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-500'}`}>
                                {melt.conclusion.finalVerdict}
                            </span>
                        </div>
                        {melt.conclusion.comments && (
                            <div className="col-span-2 text-sm text-yellow-500 italic mt-2">"{melt.conclusion.comments}"</div>
                        )}
                        <div className="col-span-2 text-xs text-neutral-500 text-right mt-2">Заключение выдал: {melt.conclusion.employee?.fullName}</div>
                    </div>
                ) : (user?.role === 'OTC' || user?.role === 'TECH' || user?.role === 'MASTER' || user?.role === 'ADMIN' || user?.role === 'DIRECTOR') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Хим. анализ</label>
                            <select value={chemStatus} onChange={e => setChemStatus(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white">
                                <option value="В норме">В норме</option>
                                <option value="Отклонение">Отклонение</option>
                                <option value="Не сдавали">Не сдавали</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Механич. испытания</label>
                            <select value={mechStatus} onChange={e => setMechStatus(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white">
                                <option value="В норме">В норме</option>
                                <option value="Отклонение">Отклонение</option>
                                <option value="Ожидание">Ожидание</option>
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs text-neutral-400 mb-1">Вердикт</label>
                            <select value={finalVerdict} onChange={e => setFinalVerdict(e.target.value)} className={`w-full bg-neutral-950 border rounded p-2 font-bold ${finalVerdict === 'Годна' ? 'text-green-400 border-green-700/50' : 'text-red-500 border-red-700/50'}`}>
                                <option value="Годна">Годна</option>
                                <option value="Изолятор">Изолятор (Брак)</option>
                                <option value="Ограниченно годна">Ограниченно годна</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4">
                            <label className="block text-xs text-neutral-400 mb-1">Дополнительные комментарии</label>
                            <input value={comments} onChange={e => setComments(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white" placeholder="Например: Понижен предел прочности, отправлено на термообработку" />
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 mt-2">
                            <button onClick={handleSaveConclusion} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors">
                                {melt.conclusion ? 'Обновить Заключение' : 'Выдать Заключение'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-neutral-500 text-sm">Нет выданного заключения</div>
                )}
            </div>
        </div>
    );
}


