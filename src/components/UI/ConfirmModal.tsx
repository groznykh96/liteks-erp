import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmModal({
    isOpen,
    title = 'Подтверждение действия',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Удалить',
    cancelText = 'Отмена'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-500/20 p-2 rounded-full">
                        <AlertTriangle className="text-red-500" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <p className="text-neutral-300 text-sm mb-6 leading-relaxed">
                    {message}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors shadow-md text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
