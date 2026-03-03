import { useState, useEffect, useMemo } from 'react';
import { Target, Beaker, AlertTriangle, Plus, TrendingDown } from 'lucide-react';
import { api } from '../api';
import type { Alloy, Material } from '../utils/calculator';
import { ELEMENTS } from '../utils/calculator';

const formatNum = (v: number | undefined | null) => {
    if (v === undefined || v === null || isNaN(v)) return '—';
    if (v === 0) return '0';
    if (Math.abs(v) >= 1) return Number(v.toFixed(2)).toString();
    return Number(v.toFixed(4)).toString();
};

// For each element deficit, find the cheapest material (cost per 1 kg of that element delivered)
function findCheapestMaterial(el: string, materials: Material[]): Material | null {
    let best: Material | null = null;
    let bestCostPerKgEl = Infinity;
    for (const mat of materials) {
        const content = Number(mat[el]) || 0;
        if (content <= 0) continue;
        const assimilation = (mat.assimilation || 100) / 100;
        const effectiveContent = (content / 100) * assimilation; // fraction of element in 1 kg mat after assimilation
        const price = Number(mat.price) || 0;
        // cost per 1 kg of element delivered = price / effectiveContent
        // lower is better
        const costPerKgEl = price > 0 ? price / effectiveContent : 0; // 0 price = free, prefer it
        if (best === null || costPerKgEl < bestCostPerKgEl) {
            best = mat;
            bestCostPerKgEl = costPerKgEl;
        }
    }
    return best;
}

export default function Correction() {
    const [alloys, setAlloys] = useState<Alloy[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    const [selectedAlloyId, setSelectedAlloyId] = useState<number>(0);
    const [meltMass, setMeltMass] = useState(1000);
    const [meltTimeHours, setMeltTimeHours] = useState(0.5);
    const [facts, setFacts] = useState<Record<string, number>>({ C: 0.08, Si: 0.50, Mn: 0.40, Cr: 17.5, Ni: 8.5, S: 0.0, P: 0.0, Cu: 0.0 });
    const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>({});

    useEffect(() => {
        async function load() {
            const als = await api.getAlloys();
            const mats = await api.getMaterials();
            setAlloys(als);
            setMaterials(mats);
            if (als.length > 0) setSelectedAlloyId(als[0].id);
        }
        load();
    }, []);

    const alloy = alloys.find(a => a.id === selectedAlloyId);

    const targets = useMemo(() => {
        const res: Record<string, number> = {};
        if (!alloy) return res;
        ELEMENTS.forEach(el => {
            const min = Number(alloy[`${el}_min`]) || 0;
            const maxRaw = alloy[`${el}_max`];
            const max = maxRaw !== undefined ? Number(maxRaw) : min;
            res[el] = maxRaw !== undefined ? (min + max) / 2 : min;
        });
        return { ...res, ...targetOverrides };
    }, [alloy, targetOverrides]);

    const handleTargetChange = (el: string, val: number) => {
        setTargetOverrides(prev => ({ ...prev, [el]: val }));
    };

    const handleFactChange = (el: string, val: number) => {
        setFacts(prev => ({ ...prev, [el]: val }));
    };

    const cMax = alloy ? (Number(alloy.C_max) || 0.12) : 0.12;
    const cExceeded = facts.C > cMax;

    // Build corrections: for each element with deficit, find cheapest material
    // Then deduplicate: if same material is chosen for multiple elements, merge them
    const correctionRows = useMemo(() => {
        // Step 1: calculate deficits and best material for each element
        const raw: Array<{
            el: string;
            factPct: number;
            targetPct: number;
            deficitKg: number;
            mat: Material | null;
            contentInMat: number;
            assimilation: number;
            addMass: number;
            costPerRow: number;
        }> = [];

        // Skip C — it cannot be corrected by adding materials
        const correctableEls = ELEMENTS.filter(el => el !== 'C');

        for (const el of correctableEls) {
            const targetPct = targets[el] || 0;
            const factPct = facts[el] || 0;
            const deficitKg = (targetPct - factPct) * meltMass / 100;

            // only process elements that need to be raised
            if (deficitKg <= 0.001) continue;

            const mat = findCheapestMaterial(el, materials);
            const contentInMat = mat ? (Number(mat[el]) || 0) : 0;
            const assimilation = mat ? (mat.assimilation || 100) / 100 : 1;
            const addMass = deficitKg > 0 && contentInMat > 0
                ? deficitKg / ((contentInMat / 100) * assimilation)
                : 0;
            const costPerRow = addMass * (mat?.price || 0);

            raw.push({ el, factPct, targetPct, deficitKg, mat, contentInMat, assimilation, addMass, costPerRow });
        }

        // Step 2: deduplicate by material — if same material assigned to multiple elements, combine into one row
        const matMap = new Map<number | string, typeof raw[0] & { elements: string[] }>();

        for (const row of raw) {
            const matKey = row.mat ? row.mat.id : `none_${row.el}`;
            if (matMap.has(matKey)) {
                const existing = matMap.get(matKey)!;
                // Combine: add masses and costs, list elements
                existing.addMass += row.addMass;
                existing.costPerRow += row.costPerRow;
                existing.elements.push(row.el);
                // deficit display: show the dominant one
                existing.deficitKg += row.deficitKg;
            } else {
                matMap.set(matKey, { ...row, elements: [row.el] });
            }
        }

        return Array.from(matMap.values());
    }, [targets, facts, meltMass, materials]);

    const totalMaterialCost = useMemo(() => correctionRows.reduce((s, r) => s + r.costPerRow, 0), [correctionRows]);
    const energyCost = 400 * meltTimeHours * 5.5;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Target Chemistry */}
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-700 pb-2">
                        <Target size={18} className="text-blue-500" /> Рекомендуемая химия (цель)
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Марка сплава (ГОСТ)</label>
                            <select
                                value={selectedAlloyId}
                                onChange={e => { setSelectedAlloyId(Number(e.target.value)); setTargetOverrides({}); }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                {alloys.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Целевые значения, %</label>
                            <div className="grid grid-cols-4 gap-2">
                                {ELEMENTS.map(el => (
                                    <div key={el} className="flex flex-col">
                                        <span className="text-[10px] text-center text-neutral-500">{el}</span>
                                        <input
                                            type="number" step="0.01" value={targets[el] !== undefined ? targets[el].toFixed(3) : 0}
                                            onChange={e => handleTargetChange(el, Number(e.target.value) || 0)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-sm font-mono focus:border-blue-500 transition-colors text-blue-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Facts */}
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 shadow-lg">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-700 pb-2">
                        <Beaker size={18} className="text-purple-500" /> Фактический состав расплава
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Остаток плавки, кг</label>
                                <input
                                    type="number" step="10" value={meltMass} onChange={e => setMeltMass(Number(e.target.value))}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Время на плавку, ч</label>
                                <input
                                    type="number" step="0.1" value={meltTimeHours} onChange={e => setMeltTimeHours(Number(e.target.value))}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-white font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Анализ химии, %</label>
                            <div className="grid grid-cols-4 gap-2">
                                {ELEMENTS.map(el => (
                                    <div key={el} className="flex flex-col">
                                        <span className="text-[10px] text-center text-neutral-500">{el}</span>
                                        <input
                                            type="number" step="0.01" value={facts[el] !== undefined ? facts[el] : 0}
                                            onChange={e => handleFactChange(el, Number(e.target.value) || 0)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-sm font-mono focus:border-purple-500 transition-colors text-purple-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {cExceeded && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-200">
                    <AlertTriangle className="text-red-500 flex-shrink-0" />
                    <div>
                        <div className="font-bold text-red-400">Внимание: Углерод выше нормы!</div>
                        <div className="text-sm opacity-80 mt-1">Факт C = {facts.C}%, допустимый максиум = {cMax}%. Необходимо разбавлять плавку низкоуглеродистым ломом, одними легированными добавками химию не спасти.</div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex items-center gap-3">
                    <Plus size={18} className="text-green-500" />
                    <h3 className="text-lg font-bold text-white">План легирования (добавки)</h3>
                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <TrendingDown size={14} /> Подбирается наиболее экономный вариант
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center whitespace-nowrap">
                        <thead className="bg-neutral-950/40 text-neutral-400">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Элемент(ы)</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Дефицит, кг</th>
                                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Материал (выбран наилучший)</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Содержание, %</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Усвоение, %</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Масса добавки, кг</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Стоимость, ₽</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-700/50">
                            {/* Carbon row - always shown */}
                            <tr className="bg-neutral-900/40 opacity-70">
                                <td className="px-4 py-3 text-left font-bold text-white">C</td>
                                <td className={`px-4 py-3 font-mono ${cExceeded ? 'text-red-400' : 'text-green-400'}`}>
                                    {cExceeded ? 'ПРЕВЫШЕН' : 'В НОРМЕ'}
                                </td>
                                <td colSpan={5} className="px-4 py-3 text-left italic text-neutral-500">
                                    Углерод корректируется разбавлением низкоуглеродистым ломом
                                </td>
                            </tr>

                            {correctionRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-green-400 font-semibold">
                                        ✅ Химический состав в норме — добавки не требуются
                                    </td>
                                </tr>
                            )}

                            {correctionRows.map((row, i) => (
                                <tr key={i} className="hover:bg-neutral-700/30 transition-colors">
                                    <td className="px-4 py-3 text-left">
                                        {row.elements.map(el => (
                                            <span key={el} className="inline-block font-bold text-white mr-1 bg-neutral-700 px-1.5 py-0.5 rounded text-xs">{el}</span>
                                        ))}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-yellow-400">
                                        +{formatNum(row.deficitKg)} кг
                                    </td>
                                    <td className="px-4 py-3 text-left">
                                        <div className="font-medium text-neutral-200">{row.mat ? row.mat.name : '—'}</div>
                                        {row.mat && <div className="text-[10px] text-emerald-500 mt-0.5">Цена: {row.mat.price ? `${row.mat.price} ₽/кг` : 'не указана'}</div>}
                                    </td>
                                    <td className="px-4 py-3 font-mono">{formatNum(row.contentInMat)} %</td>
                                    <td className="px-4 py-3 font-mono">{row.mat ? (row.mat.assimilation || 100) : 100} %</td>
                                    <td className={`px-4 py-3 font-mono font-bold ${row.addMass > 0 ? 'text-white' : 'text-green-400'}`}>
                                        {row.addMass > 0 ? formatNum(row.addMass) : '0'} кг
                                    </td>
                                    <td className="px-4 py-3 font-mono text-amber-300">
                                        {formatNum(row.costPerRow)} ₽
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-neutral-900/80 border-t border-neutral-700">
                            <tr>
                                <td colSpan={5} className="px-4 py-4 text-right">
                                    <strong>Затраты на дошихтовку:</strong>
                                    <span className="mx-2 text-neutral-400">|</span>
                                    Материалы: <span className="text-neutral-200">{formatNum(totalMaterialCost)} ₽</span>
                                    <span className="mx-2 text-neutral-400">|</span>
                                    Э/э: <span className="text-neutral-200">{formatNum(energyCost)} ₽</span>
                                </td>
                                <td></td>
                                <td className="px-4 py-4 text-right">
                                    <span className="text-lg font-bold">Итого: <span className="text-red-400">{formatNum(totalMaterialCost + energyCost)} ₽</span></span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
