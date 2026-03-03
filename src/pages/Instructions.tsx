import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, AlertCircle, Loader } from 'lucide-react';
import API_BASE from '../config';

// Safe line-by-line Markdown renderer as JSX
function MarkdownRenderer({ text }: { text: string }) {
    // Guard: if text is not a string, show nothing
    if (!text || typeof text !== 'string') {
        return <p className="text-sm text-neutral-400">Содержимое инструкции не найдено.</p>;
    }

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let key = 0;

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={key++} className="list-disc pl-5 space-y-1 mb-3 text-sm text-neutral-300">
                    {listItems.map((item, i) => (
                        <li key={i}>{renderInline(item)}</li>
                    ))}
                </ul>
            );
            listItems = [];
        }
    };

    const renderInline = (line: string): React.ReactNode => {
        if (!line) return null;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    for (const line of lines) {
        if (line.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={key++} className="text-base font-bold text-white mt-5 mb-2 border-b border-neutral-700 pb-1">
                    {line.slice(3)}
                </h3>
            );
        } else if (line.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={key++} className="text-sm font-bold text-neutral-200 mt-4 mb-1">{line.slice(4)}</h4>
            );
        } else if (line.startsWith('- ')) {
            listItems.push(line.slice(2));
        } else if (line.trim() === '') {
            flushList();
        } else {
            flushList();
            elements.push(
                <p key={key++} className="text-sm text-neutral-300 mb-2 leading-relaxed">{renderInline(line)}</p>
            );
        }
    }
    flushList();

    return <div className="space-y-0.5">{elements}</div>;
}

const ROLE_COLORS: Record<string, string> = {
    WORKER: 'text-orange-400',
    MASTER: 'text-blue-400',
    OTK: 'text-purple-400',
    DIRECTOR: 'text-emerald-400',
    TECH: 'text-teal-400',
    SALES: 'text-orange-300',
    ADMIN: 'text-red-400',
};

export default function Instructions() {
    const { user } = useAuth();
    const [instruction, setInstruction] = useState<{ title: string; content: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!user) return;
        const roleKey = user.role === 'OTC' ? 'OTK' : (user.role === 'TECHNOLOGIST' ? 'TECH' : user.role);
        const token = localStorage.getItem('token');

        fetch(`${API_BASE}/instructions/${roleKey}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(async r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                // Ensure we got a proper object with content string
                if (data && typeof data.content === 'string') {
                    setInstruction(data);
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(() => {
                // Server not running or error — show default fallback text
                setError(true);
                setInstruction({
                    title: 'Инструкция',
                    content: `## Инструкция недоступна\nСервер временно недоступен. Обратитесь к администратору системы ЛИТЭКС.`
                });
            })
            .finally(() => setLoading(false));
    }, [user]);

    if (!user) return null;

    const colorClass = ROLE_COLORS[user.role] || ROLE_COLORS['WORKER'];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-800 rounded-xl p-8 border border-neutral-700 shadow-2xl text-neutral-200">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-700">
                    <div className="p-4 bg-blue-900/30 text-blue-400 rounded-lg">
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Персональные инструкции</h2>
                        <p className="text-neutral-400 mt-1">Руководство по эксплуатации системы ЛИТЭКС ERP для вашей роли.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center gap-3 text-neutral-400 py-10 justify-center">
                        <Loader className="animate-spin" size={20} />
                        Загрузка инструкции...
                    </div>
                ) : instruction ? (
                    <div>
                        <h3 className={`text-xl font-bold mb-6 ${colorClass}`}>{instruction.title}</h3>
                        <MarkdownRenderer text={instruction.content} />
                    </div>
                ) : (
                    <div className="text-neutral-500 text-center py-10">Инструкция не найдена.</div>
                )}

                {error && (
                    <div className="mt-4 bg-yellow-900/20 border border-yellow-800 text-yellow-400 text-xs rounded p-3">
                        ⚠ Не удалось загрузить актуальный текст с сервера — показан резервный вариант.
                    </div>
                )}

                <div className="mt-10 bg-neutral-900/50 p-4 rounded border border-neutral-800 flex items-start gap-4 text-sm text-neutral-400">
                    <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <p>По всем техническим вопросам и сбоям системы обращайтесь в отдел информационных технологий ЛИТЭКС.</p>
                </div>
            </div>
        </div>
    );
}
