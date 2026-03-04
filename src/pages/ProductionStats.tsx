import { useState, useEffect } from 'react';
import { api } from '../api';
import { PieChart, TrendingDown, TrendingUp, Users } from 'lucide-react';

interface StageStat {
    stage: string;
    stageLabel: string;
    qtyIn: number;
    qtyOut: number;
    qtyRejected: number;
    count: number;
}

interface WorkerStat {
    workerId: string;
    name: string;
    role: string;
    processed: number;
    rejected: number;
}

export default function ProductionStats() {
    const [stats, setStats] = useState<{ byStage: StageStat[], byWorker: WorkerStat[], total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getStagesStats({ from: dateFrom, to: dateTo });
            setStats(data);
        } catch (e) {
            console.error('Failed to load stats', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadData();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <PieChart className="text-purple-500" /> Статистика цеха
                </h2>
            </div>

            <form onSubmit={handleFilterSubmit} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-wrap gap-4 items-end shadow-md">
                <div>
                    <label className="block text-xs text-neutral-400 mb-1 uppercase font-bold tracking-wider">Период с</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-purple-500 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs text-neutral-400 mb-1 uppercase font-bold tracking-wider">Период по</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-purple-500 transition-colors" />
                </div>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded font-bold transition-colors">
                    Показать
                </button>
            </form>

            {loading ? (
                <div className="text-neutral-400 animate-pulse text-center py-10">Загрузка статистики...</div>
            ) : !stats ? (
                <div className="text-center py-10 text-neutral-500">Нет данных для отображения</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stage Stats */}
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-neutral-900 p-4 border-b border-neutral-700 flex items-center gap-2">
                            <TrendingUp className="text-blue-400" size={20} />
                            <h3 className="font-bold text-lg">Воронка по этапам</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {stats.byStage.map((s, idx) => {
                                const rejectionRate = s.qtyOut + s.qtyRejected > 0
                                    ? ((s.qtyRejected / (s.qtyOut + s.qtyRejected)) * 100).toFixed(1)
                                    : '0.0';

                                return (
                                    <div key={idx} className="bg-neutral-900 border border-neutral-700 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="font-bold text-lg text-white mb-1">{s.stageLabel}</div>
                                            <div className="text-xs text-neutral-500">Кол-во закрытых этапов: {s.count}</div>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <div className="text-center">
                                                <div className="text-neutral-500 text-xs mb-1">Годных</div>
                                                <div className="font-mono font-bold text-green-400 text-lg">{s.qtyOut}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-neutral-500 text-xs mb-1">Брак</div>
                                                <div className="font-mono font-bold text-red-400 text-lg">{s.qtyRejected}</div>
                                            </div>
                                            <div className="text-center border-l border-neutral-700 pl-6">
                                                <div className="text-neutral-500 text-xs mb-1">% Брака</div>
                                                <div className={`font-mono font-bold text-lg ${parseFloat(rejectionRate) > 5 ? 'text-red-400' : 'text-neutral-300'}`}>
                                                    {rejectionRate}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.byStage.length === 0 && (
                                <div className="text-neutral-500 italic text-center py-4">Нет завершенных этапов в этом периоде.</div>
                            )}
                        </div>
                    </div>

                    {/* Worker Stats */}
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-neutral-900 p-4 border-b border-neutral-700 flex items-center gap-2">
                            <Users className="text-green-400" size={20} />
                            <h3 className="font-bold text-lg">Выработка сотрудников</h3>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-neutral-900/50 text-neutral-400 text-xs uppercase tracking-wider">
                                        <th className="p-4 border-b border-neutral-700">Сотрудник</th>
                                        <th className="p-4 border-b border-neutral-700 text-right">Сдал (Годных)</th>
                                        <th className="p-4 border-b border-neutral-700 text-right">Сдал (Брак)</th>
                                        <th className="p-4 border-b border-neutral-700 text-right">% Брака</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.byWorker.map((w, idx) => {
                                        const rate = w.processed + w.rejected > 0
                                            ? ((w.rejected / (w.processed + w.rejected)) * 100).toFixed(1)
                                            : '0.0';

                                        return (
                                            <tr key={idx} className="border-b border-neutral-800/50 hover:bg-neutral-800 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-neutral-200">{w.name}</div>
                                                    <div className="text-xs text-neutral-500">{w.role}</div>
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-green-400">{w.processed}</td>
                                                <td className="p-4 text-right font-mono text-neutral-400">{w.rejected}</td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(rate) > 5 ? 'bg-red-900/30 text-red-400' : 'bg-neutral-700 text-neutral-300'}`}>
                                                        {rate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {stats.byWorker.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-neutral-500 italic">
                                                Нет данных по сотрудникам за период.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
