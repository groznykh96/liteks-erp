import { useState, useEffect, useMemo } from 'react';
import { Settings, Play, RefreshCw, Save, CheckCircle, XCircle, Target } from 'lucide-react';
import { api } from '../api';
import type { Alloy, Material, Burnout } from '../utils/calculator';
import { ELEMENTS, runSolver, calculateChemistry } from '../utils/calculator';

const formatNum = (v: number | undefined | null) => {
    if (v === undefined || v === null || isNaN(v)) return '—';
    if (v === 0) return '0';
    if (Math.abs(v) >= 1) return Number(v.toFixed(2)).toString();
    return Number(v.toFixed(4)).toString();
};

export default function ChargeCalculator() {
    const [alloys, setAlloys] = useState<Alloy[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    const [selectedAlloyId, setSelectedAlloyId] = useState<number>(0);
    const [meltTimeHours, setMeltTimeHours] = useState<number>(2.0);
    const [totalChargeMassKg, setTotalChargeMassKg] = useState<number>(1000);

    const [burnout, setBurnout] = useState<Burnout>({ C: 0, Si: 15, Mn: 30, Cr: 5, Ni: 0, S: 0, P: 0, Cu: 0 });
    const [enabledMaterials, setEnabledMaterials] = useState<Record<number, boolean>>({});
    const [masses, setMasses] = useState<Record<number, number>>({});

    useEffect(() => {
        async function load() {
            const als = await api.getAlloys();
            const mats = await api.getMaterials();
            setAlloys(als);
            setMaterials(mats);
            if (als.length > 0) setSelectedAlloyId(als[0].id);

            const initialsE: Record<number, boolean> = {};
            const initialsM: Record<number, number> = {};
            mats.forEach((m: Material) => {
                initialsE[m.id] = true;
                initialsM[m.id] = 0;
            });
            setEnabledMaterials(initialsE);
            setMasses(initialsM);
        }
        load();
    }, []);

    const selectedAlloy = alloys.find(a => a.id === selectedAlloyId);

    const handleSolve = () => {
        if (!selectedAlloy) return;
        const activeMats = materials.filter(m => enabledMaterials[m.id]);
        const computedMasses = runSolver(selectedAlloy, activeMats, burnout);

        const newMasses = { ...masses };
        activeMats.forEach((m, i) => {
            newMasses[m.id] = computedMasses[i];
        });
        setMasses(newMasses);
    };

    const handleReset = () => {
        const newMasses = { ...masses };
        Object.keys(newMasses).forEach(k => newMasses[Number(k)] = 0);
        setMasses(newMasses);
    };

    const handleSaveCalc = async (finalCost: number) => {
        if (!selectedAlloy) return;
        const details = materials
            .filter(m => enabledMaterials[m.id] && masses[m.id] > 0)
            .map(m => ({
                materialId: m.id,
                name: m.name,
                massPct: masses[m.id],
                massKg: (masses[m.id] / 100) * totalChargeMassKg,
                price: m.price || 0
            }));

        const detailsStr = details.map(d => `${d.name}: ${d.massKg.toFixed(1)} кг`).join(', ');
        const calc = {
            id: Date.now(),
            date: new Date().toISOString(),
            meltNumber: `П-${Date.now().toString().slice(-4)}`,
            alloyId: selectedAlloy.id,
            totalCost: finalCost,
            meltMass: totalChargeMassKg,
            note: `Авторасчет шихты. Состав: ${detailsStr}`,
            castings: []
        };

        await api.saveMelt(calc);
        alert('Расчет успешно сохранен в Журнал плавок!');
    };

    const chemistry = useMemo(() => {
        const massesArr = materials.map(m => enabledMaterials[m.id] ? (masses[m.id] || 0) : 0);
        return calculateChemistry(materials, massesArr, burnout);
    }, [materials, enabledMaterials, masses, burnout]);

    const totalMassPct = useMemo(() => {
        return Object.values(materials).reduce((acc, m) => acc + (enabledMaterials[m.id] ? (masses[m.id] || 0) : 0), 0);
    }, [materials, enabledMaterials, masses]);

    const energyCost = 400 * meltTimeHours * 5.5; // KW * h * price/kwh -> simplified
    const materialCost = materials.reduce((acc, m) => {
        if (!enabledMaterials[m.id]) return acc;
        const massKg = ((masses[m.id] || 0) / 100) * totalChargeMassKg;
        return acc + massKg * (m.price || 0);
    }, 0);
    const totalCost = energyCost + materialCost;

    const statuses = useMemo(() => {
        const res: Record<string, string> = {};
        if (!selectedAlloy || totalMassPct === 0) return res;

        ELEMENTS.forEach(el => {
            const v = chemistry[el];
            const min = Number(selectedAlloy[`${el}_min`]) || 0;
            const maxRaw = selectedAlloy[`${el}_max`];
            if (maxRaw == null) { res[el] = 'ok'; return; }
            const max = Number(maxRaw);

            if (v >= min && v <= max) res[el] = 'ok';
            else if (v < min * 0.9 || v > max * 1.1) res[el] = 'err';
            else res[el] = 'warn';
        });
        return res;
    }, [chemistry, selectedAlloy, totalMassPct]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Parameters */}
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg lg:col-span-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-700 pb-2">
                        <Settings size={18} className="text-red-500" /> Параметры расчета
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Марка сплава (ГОСТ)</label>
                            <select
                                value={selectedAlloyId}
                                onChange={e => setSelectedAlloyId(Number(e.target.value))}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                            >
                                {alloys.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Время плавки, ч</label>
                                <input
                                    type="number" step="0.1" value={meltTimeHours} onChange={e => setMeltTimeHours(Number(e.target.value))}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Вес шихты, кг</label>
                                <input
                                    type="number" step="10" value={totalChargeMassKg} onChange={e => setTotalChargeMassKg(Number(e.target.value))}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Угар химических элементов, %</label>
                            <div className="grid grid-cols-4 gap-2">
                                {ELEMENTS.map(el => (
                                    <div key={el} className="flex flex-col">
                                        <span className="text-[10px] text-center text-neutral-500">{el}</span>
                                        <input
                                            type="number" value={burnout[el]}
                                            onChange={e => setBurnout({ ...burnout, [el]: Number(e.target.value) || 0 })}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-sm font-mono focus:border-red-500 transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Chemistry */}
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg lg:col-span-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-700 pb-2">
                        <Target size={18} className="text-red-500" /> Целевая химия — {selectedAlloy?.name}
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center">
                            <thead>
                                <tr className="text-neutral-400 uppercase text-xs tracking-wider border-b border-neutral-700">
                                    <th className="text-left py-2 font-semibold">Показатель</th>
                                    {ELEMENTS.map(el => <th key={el} className="py-2 font-semibold">{el}, %</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-700/50">
                                <tr>
                                    <td className="text-left font-medium py-3 text-neutral-300">Минимум</td>
                                    {ELEMENTS.map(el => <td key={el} className="font-mono text-neutral-300">{formatNum(Number(selectedAlloy?.[`${el}_min`]) || 0)}</td>)}
                                </tr>
                                <tr>
                                    <td className="text-left font-medium py-3 text-neutral-300">Максимум</td>
                                    {ELEMENTS.map(el => <td key={el} className="font-mono text-neutral-300">{formatNum(selectedAlloy?.[`${el}_max`] as number)}</td>)}
                                </tr>
                                <tr className="bg-red-500/10 text-red-100 font-bold border-t border-red-500/30">
                                    <td className="text-left py-3">ИТОГ (после угара)</td>
                                    {ELEMENTS.map(el => (
                                        <td key={el} className={`font-mono ${statuses[el] === 'ok' ? 'text-green-400' : statuses[el] === 'err' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {totalMassPct > 0 ? formatNum(chemistry[el]) : '—'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Charge Table */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-neutral-700 flex flex-wrap gap-4 items-center justify-between bg-neutral-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Play size={18} className="text-red-500" /> Подбор шихтовых материалов
                    </h3>
                    <div className="flex gap-3">
                        <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors text-sm">
                            <RefreshCw size={16} /> Очистить
                        </button>
                        <button onClick={handleSolve} className="flex items-center gap-2 px-6 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md shadow-red-900/20 active:scale-95">
                            <RefreshCw size={16} /> АВТОПОДБОР (МАКРОС)
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center whitespace-nowrap">
                        <thead className="bg-neutral-950/40 text-neutral-400">
                            <tr>
                                <th className="px-4 py-3"><input type="checkbox" className="accent-red-500 w-4 h-4 cursor-pointer" /></th>
                                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Материал</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Масса, %</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Цена, ₽/кг</th>
                                {ELEMENTS.map(el => <th key={el} className="px-2 py-3 font-semibold uppercase tracking-wider text-[11px] text-neutral-500">{el}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-700/50">
                            {materials.map(m => {
                                const isEnabled = enabledMaterials[m.id];
                                return (
                                    <tr key={m.id} className={`${!isEnabled ? 'opacity-40 bg-neutral-900/40' : 'hover:bg-neutral-700/30'} transition-colors`}>
                                        <td className="px-4 py-2">
                                            <input
                                                type="checkbox" checked={isEnabled}
                                                onChange={e => setEnabledMaterials({ ...enabledMaterials, [m.id]: e.target.checked })}
                                                className="accent-red-500 w-4 h-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-left font-medium text-neutral-200">{m.name}</td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number" step="0.1" min="0" disabled={!isEnabled}
                                                value={masses[m.id]}
                                                onChange={e => setMasses({ ...masses, [m.id]: Number(e.target.value) || 0 })}
                                                className={`w-20 bg-neutral-900 border ${isEnabled ? 'border-neutral-600' : 'border-neutral-800'} rounded p-1 text-center font-mono focus:border-red-500 outline-none`}
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-mono text-green-400/80">{formatNum(m.price)}</td>
                                        {ELEMENTS.map(el => (
                                            <td key={el} className="px-2 py-2 font-mono text-neutral-400 text-xs">{formatNum(Number(m[el]) || 0)}</td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-neutral-900/80 border-t border-neutral-700">
                            <tr>
                                <td></td>
                                <td className="px-4 py-4 text-left font-bold text-white">ИТОГО МАССА:</td>
                                <td className="px-4 py-4 font-bold font-mono text-lg">
                                    <span className={Math.abs(totalMassPct - 100) > 0.1 ? 'text-red-400' : 'text-green-400'}>{formatNum(totalMassPct)}</span>
                                </td>
                                <td></td>
                                <td colSpan={ELEMENTS.length} className="px-4 py-4 text-right">
                                    <div className="text-neutral-400 font-medium">СЕБЕСТОИМОСТЬ ПЛАВКИ:</div>
                                    <div className="text-xl font-bold text-red-400">{formatNum(totalCost)} ₽</div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Result Status Banner */}
                {totalMassPct > 0 && selectedAlloy && (
                    <div className="p-4 border-t border-neutral-700">
                        {Object.values(statuses).some(s => s === 'err') ? (
                            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-200">
                                <XCircle className="text-red-500 flex-shrink-0" />
                                <div>
                                    <div className="font-bold text-red-400">Внимание: химический состав за гранью ГОСТ</div>
                                    <div className="text-sm opacity-80 mt-1">Один или несколько элементов выходят за рамки допустимого предела. Исправьте массы или запустите Автоподбор.</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 flex items-center justify-between text-green-200">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-green-400 flex-shrink-0" />
                                    <div>
                                        <div className="font-bold text-green-400">Расчет в пределах нормы</div>
                                        <div className="text-sm opacity-80 mt-1">Сплав совпадает с маркой <strong>{selectedAlloy.name}</strong>. Вы можете добавить этот расчет в Журнал плавок.</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSaveCalc(totalCost)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-md shadow-green-900/20 active:scale-95"
                                >
                                    <Save size={18} /> СОХРАНИТЬ В ЖУРНАЛ
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
