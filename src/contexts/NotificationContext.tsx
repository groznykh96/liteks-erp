
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { api } from '../api';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmOptions {
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    unreadCounts: { training: number; tasks: number; total: number };
    refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmModal, setConfirmModal] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);
    const [unreadCounts, setUnreadCounts] = useState({ training: 0, tasks: 0, total: 0 });

    const refreshCounts = useCallback(async () => {
        try {
            const [training, tasks] = await Promise.all([
                api.getMyTraining().catch(() => []),
                api.getDirectorTasks().catch(() => [])
            ]);

            const pendingTraining = training.filter((a: any) => a.status !== 'READ').length;
            const pendingTasks = tasks.filter((t: any) => t.status === 'NEW' || t.status === 'IN_PROGRESS').length;

            setUnreadCounts({
                training: pendingTraining,
                tasks: pendingTasks,
                total: pendingTraining + pendingTasks
            });
        } catch (error) {
            console.error('Failed to refresh counts:', error);
        }
    }, []);

    // Initial load and periodic refresh
    React.useEffect(() => {
        refreshCounts();
        const interval = setInterval(refreshCounts, 60000); // every minute
        return () => clearInterval(interval);
    }, [refreshCounts]);

    const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmModal({ ...options, resolve });
        });
    }, []);

    const handleConfirmAction = (result: boolean) => {
        if (confirmModal) {
            confirmModal.resolve(result);
            setConfirmModal(null);
        }
    };

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showNotification, confirm, unreadCounts, refreshCounts }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-full duration-300 ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' :
                            n.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' :
                                n.type === 'warning' ? 'bg-orange-900/90 border-orange-500/50 text-orange-100' :
                                    'bg-blue-900/90 border-blue-500/50 text-blue-100'
                            } backdrop-blur-md`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {n.type === 'success' && <CheckCircle size={20} className="text-emerald-400" />}
                            {n.type === 'error' && <XCircle size={20} className="text-red-400" />}
                            {n.type === 'warning' && <AlertCircle size={20} className="text-orange-400" />}
                            {n.type === 'info' && <Info size={20} className="text-blue-400" />}
                        </div>

                        <div className="flex-1 text-sm font-medium leading-relaxed uppercase tracking-wide">
                            {n.message}
                        </div>

                        <button
                            onClick={() => removeNotification(n.id)}
                            className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Modern Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${confirmModal.type === 'danger' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                                {confirmModal.type === 'danger' ? <AlertCircle className="text-red-500" /> : <Info className="text-blue-500" />}
                            </div>
                            <h3 className="text-lg font-bold text-white">{confirmModal.title || 'Подтвердите действие'}</h3>
                        </div>
                        <p className="text-neutral-300 text-sm mb-6 leading-relaxed">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleConfirmAction(false)}
                                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2.5 rounded-xl transition-all"
                            >
                                {confirmModal.cancelText || 'Отмена'}
                            </button>
                            <button
                                onClick={() => handleConfirmAction(true)}
                                className={`flex-1 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                    }`}
                            >
                                {confirmModal.confirmText || 'ОК'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};
