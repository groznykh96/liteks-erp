import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutGrid, Printer } from 'lucide-react';

export default function CompetencyMatrix() {
    const { user } = useAuth();
    const [data, setData] = useState<any>({ users: [], materials: [] });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const matrixData = await api.getCompetencyMatrix();
            setData(matrixData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (user?.role !== 'ADMIN' && user?.role !== 'DIRECTOR') {
        return <div className="p-4 text-red-500">Доступ запрещен.</div>;
    }

    if (loading) return <div className="text-neutral-400 p-6">Загрузка матрицы...</div>;

    const { users, materials } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <LayoutGrid className="text-blue-500" /> Матрица Компетенций
                </h2>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                >
                    <Printer size={18} /> Печать / PDF
                </button>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-x-auto shadow-xl print:text-black print:bg-white print:border-none">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-neutral-900 border-b border-neutral-700 print:bg-gray-100 print:border-gray-400">
                            <th className="p-3 font-semibold text-neutral-400 uppercase tracking-wider sticky left-0 z-10 bg-neutral-900 print:bg-gray-100">
                                Отдел / Сотрудник
                            </th>
                            {materials.map((m: any) => (
                                <th key={m.id} className="p-3 font-semibold text-neutral-400 border-l border-neutral-800 max-w-[150px] truncate print:border-gray-400">
                                    <div title={m.title} className="truncate">{m.title}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 print:divide-gray-300">
                        {users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-neutral-700/50 transition-colors">
                                <td className="p-3 sticky left-0 bg-neutral-800 print:bg-white inset-0 flex flex-col border-r border-neutral-700 print:border-gray-300">
                                    <span className="font-bold text-white print:text-black">{u.fullName}</span>
                                    <span className="text-xs text-neutral-500 print:text-gray-600">
                                        {u.department || u.role}
                                    </span>
                                </td>
                                {materials.map((m: any) => {
                                    const assignment = u.trainingAssignments.find((a: any) => a.materialId === m.id);
                                    let content = <span className="text-neutral-600 print:text-gray-400">—</span>;
                                    let cellClass = "p-3 text-center border-l border-neutral-800 border-b border-neutral-800/50 print:border-gray-300";

                                    if (assignment) {
                                        if (assignment.status === 'READ') {
                                            content = (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-green-500 font-bold print:hidden">✔</span>
                                                    <span className="text-green-700 font-bold hidden print:inline">Ознакомлен</span>
                                                    <span className="text-[10px] text-green-700/70 mt-0.5">
                                                        {new Date(assignment.readAt).toLocaleDateString('ru-RU')}
                                                    </span>
                                                </div>
                                            );
                                            cellClass += " bg-green-900/10";
                                        } else {
                                            content = (
                                                <div className="text-red-400 font-bold print:text-red-600">
                                                    Ожидает
                                                </div>
                                            );
                                            cellClass += " bg-red-900/10";
                                        }
                                    }

                                    return (
                                        <td key={`${u.id}-${m.id}`} className={cellClass}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="p-6 text-center text-neutral-500">Нет данных о пользователях</div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { background: white; }
                    * { color: black !important; }
                    .bg-neutral-800 { background: white !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}} />
        </div>
    );
}
