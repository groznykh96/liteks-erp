import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Check, X, Package, FileImage, Download, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Nomenclature { code: string; name: string; }
interface Task {
    id: number;
    nomenclature: Nomenclature;
    quantity: number;
}
interface Batch {
    id: number;
    batchNumber: string;
    completedQuantity: number;
    createdAt: string;
    task: Task;
    worker: { fullName: string };
    qcReports: QCReport[];
}
interface QCReport {
    id: number;
    inspectionDate: string;
    acceptedQty: number;
    rejectedQty: number;
    comment: string;
    batch: Batch;
    inspector: { fullName: string };
    photos?: { photoUrl: string }[];
}

export default function OTCDashboard() {
    const { user } = useAuth();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [reports, setReports] = useState<QCReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Modal state
    const [inspectBatchId, setInspectBatchId] = useState<number | null>(null);
    const [acceptedQty, setAcceptedQty] = useState('');
    const [rejectedQty, setRejectedQty] = useState('0');
    const [comment, setComment] = useState('');
    const [guiltyWorkerId, setGuiltyWorkerId] = useState<number | ''>('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [workers, setWorkers] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [b, r, users] = await Promise.all([
                api.getBatches(),
                api.getQCReports(),
                api.getUsers()
            ]);
            // Only show batches that don't have QC reports yet in the pending queue
            const pendingBatches = b.filter((batch: Batch) => !batch.qcReports || batch.qcReports.length === 0);
            setBatches(pendingBatches);
            setReports(r);
            setWorkers(users.filter((u: any) => u.role === 'WORKER' || u.role === 'MASTER'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (reports.length === 0) {
            alert('Нет данных для выгрузки');
            return;
        }

        setExporting(true);
        try {
            const data = reports.map((r: any) => ({
                'Дата проверки': new Date(r.createdAt || r.inspectionDate).toLocaleString(),
                'Партия': r.batch?.batchNumber || '-',
                'Номенклатура': r.batch?.task?.nomenclature?.name || '-',
                'Код детали': r.batch?.task?.nomenclature?.code || '-',
                'Литейщик': r.batch?.worker?.fullName || '-',
                'Инспектор ОТК': r.inspector?.fullName || '-',
                'Принято (шт)': r.acceptedQty,
                'Брак (шт)': r.rejectedQty,
                'Причина брака / Комментарий': r.comment || '',
                'Наличие фото': r.photos && r.photos.length > 0 ? 'Да' : 'Нет'
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Реестр брака");

            const fileName = `Реестр_ОТК_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            const electronApi = (window as any).api;
            if (electronApi && electronApi.saveExcelFile) {
                const result = await electronApi.saveExcelFile(Array.from(wbout), fileName);
                if (result?.success) {
                    alert(`Файл успешно сохранён:\n${result.filePath}`);
                } else if (result?.canceled) {
                    console.log('Сохранение отменено пользователем');
                } else {
                    alert('Файл сохранен (без детальной информации о пути)');
                }
            } else {
                const blob = new Blob([wbout], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Ошибка выгрузки Excel:', e);
            alert('Ошибка при сохранении файла Excel!');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleInspect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectBatchId) return;

        try {
            const payload: any = {
                batchId: inspectBatchId,
                acceptedQty: Number(acceptedQty),
                rejectedQty: Number(rejectedQty),
                comment,
                guiltyWorkerId: guiltyWorkerId !== '' ? Number(guiltyWorkerId) : undefined
            };
            if (photoUrl) {
                payload.photoUrls = [photoUrl];
            }

            await api.saveQCReport(payload);
            fetchData();
            setInspectBatchId(null);
            setAcceptedQty('');
            setRejectedQty('0');
            setComment('');
            setGuiltyWorkerId('');
            setPhotoUrl('');
            alert('Партия успешно проверена!');
        } catch (e) {
            alert('Ошибка сохранения проверки');
        }
    };

    if (user?.role !== 'OTC' && user?.role !== 'OTK' && user?.role !== 'ADMIN' && user?.role !== 'DIRECTOR' && user?.role !== 'TECH' && user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500 font-bold">У вас нет прав для просмотра АРМ ОТК</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="text-blue-500" /> Контроль Качества (ОТК) - Приемка Партий
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Очередь на приемку (Batches) */}
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">Ожидают проверки (Новые партии)</h3>

                    {loading ? (
                        <div className="text-neutral-400 animate-pulse">Загрузка...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-neutral-500 text-center py-4">Нет новых партий, ожидающих проверки</div>
                    ) : (
                        <div className="space-y-4">
                            {batches.map(b => (
                                <div key={b.id} className="bg-neutral-900 border border-neutral-700 p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="font-bold flex items-center gap-2 text-green-400 font-mono text-lg uppercase">
                                            Партия: {b.batchNumber}
                                        </div>
                                        <div className="font-bold flex items-center gap-1 text-blue-400 mt-2">
                                            <Package size={16} /> {b.task?.nomenclature?.code}
                                        </div>
                                        <div className="text-sm text-neutral-400">{b.task?.nomenclature?.name}</div>
                                        <div className="text-xs text-neutral-500 mt-2 border-t border-neutral-800 pt-1">
                                            Заявлено: <span className="text-white font-bold">{b.completedQuantity} шт</span> • Исполнитель: {b.worker?.fullName}
                                        </div>
                                        <div className="text-[10px] text-neutral-600">Создано: {new Date(b.createdAt).toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setInspectBatchId(b.id);
                                            setAcceptedQty(b.completedQuantity.toString());
                                            setRejectedQty('0');
                                            setComment('');
                                            setGuiltyWorkerId('');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-md h-fit"
                                    >
                                        Начать приемку
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Журнал проверок (QC Reports) */}
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg flex flex-col max-h-[800px]">
                    <div className="flex items-center justify-between mb-4 border-b border-neutral-700 pb-2">
                        <h3 className="text-lg font-bold">Заключения ОТК</h3>
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 text-white font-medium rounded transition-colors shadow-sm ${exporting ? 'bg-green-800 cursor-not-allowed text-neutral-300' : 'bg-green-700 hover:bg-green-600'}`}
                            title="Выгрузить реестр брака в Excel"
                        >
                            {exporting ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
                            {exporting ? 'Загрузка...' : 'Excel'}
                        </button>
                    </div>
                    {loading ? (
                        <div className="text-neutral-400 animate-pulse">Загрузка...</div>
                    ) : reports.length === 0 ? (
                        <div className="text-neutral-500 text-center py-4">История пуста</div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {reports.map((r: any) => (
                                <div key={r.id} className="bg-neutral-900 border border-neutral-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-neutral-300 font-mono text-sm">
                                            Партия: {r.batch?.batchNumber}
                                        </div>
                                        <div className="text-xs text-neutral-500">{new Date(r.createdAt || r.inspectionDate).toLocaleString()}</div>
                                    </div>
                                    <div className="text-xs text-neutral-400 mb-2 truncate" title={r.batch?.task?.nomenclature?.name}>
                                        {r.batch?.task?.nomenclature?.code} - {r.batch?.task?.nomenclature?.name}
                                    </div>
                                    <div className="flex gap-4 mb-2 mt-3">
                                        <div className="flex bg-green-900/20 text-green-400 font-mono font-bold px-2 py-1 rounded gap-1 items-center text-sm border border-green-800/50">
                                            <Check size={14} /> {r.acceptedQty} годных
                                        </div>
                                        {r.rejectedQty > 0 && (
                                            <div className="flex bg-red-900/20 text-red-400 font-mono font-bold px-2 py-1 rounded gap-1 items-center text-sm border border-red-800/50">
                                                <X size={14} /> {r.rejectedQty} брак
                                            </div>
                                        )}
                                    </div>
                                    {r.comment && <div className="text-xs text-yellow-500/80 italic mt-2 bg-yellow-900/10 p-2 rounded">"{r.comment}"</div>}
                                    {r.photos && r.photos.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-400">
                                            <FileImage size={12} /> Прикреплено фото ({r.photos.length})
                                        </div>
                                    )}
                                    <div className="text-[10px] text-neutral-500 mt-2 pt-2 border-t border-neutral-800 flex justify-between">
                                        <span>Литейщик: {r.batch?.worker?.fullName}</span>
                                        <span>Инспектор: {r.inspector?.fullName}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Модалка приемки партии */}
            {inspectBatchId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                            <ShieldCheck /> Оформить заключение ОТК
                        </h3>
                        <form onSubmit={handleInspect} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-green-400 mb-1 font-bold text-sm">Годные (шт)</label>
                                    <input type="number" min="0" value={acceptedQty} onChange={e => setAcceptedQty(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-green-700/50 rounded p-2 text-white outline-none focus:border-green-500 font-mono text-lg transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-red-500 mb-1 font-bold text-sm">Брак (шт)</label>
                                    <input type="number" min="0" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} required
                                        className="w-full bg-neutral-900 border border-red-700/50 rounded p-2 text-white outline-none focus:border-red-500 font-mono text-lg transition-colors" />
                                </div>
                            </div>

                            {Number(rejectedQty) > 0 && (
                                <div>
                                    <label className="block text-red-400 mb-1 font-bold text-sm">Виновник брака</label>
                                    <select
                                        value={guiltyWorkerId}
                                        onChange={e => setGuiltyWorkerId(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full bg-neutral-900 border border-red-700/50 rounded p-2 text-white outline-none focus:border-red-500 transition-colors"
                                    >
                                        <option value="">-- Не указывать --</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.fullName} ({w.department || 'Без цеха'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-neutral-400 mb-1 font-bold text-sm">Комментарий / Причина брака</label>
                                <textarea value={comment} onChange={e => setComment(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 h-24 resize-none transition-colors" placeholder="Газовая пористость, недолив..."></textarea>
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1 font-bold text-sm flex items-center gap-2">
                                    <FileImage size={16} /> Прикрепить фото (URL)
                                </label>
                                <input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..."
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition-colors text-sm" />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setInspectBatchId(null)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded transition-colors">Отмена</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors shadow-md">Выдать заключение</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
