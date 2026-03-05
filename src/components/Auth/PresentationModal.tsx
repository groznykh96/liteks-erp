import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ShieldCheck, Calculator, Factory, Package, Wallet } from 'lucide-react';

interface Slide {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const slides: Slide[] = [
    {
        title: 'Экосистема ЛИТЭКС',
        description: 'Единая облачная платформа для полного цикла управления современным литейным производством. От справочников до отгрузки готовой продукции.',
        icon: <ShieldCheck size={64} />,
        color: 'text-indigo-400'
    },
    {
        title: 'Умный расчет шихты',
        description: 'Автоматизированный расчет плавки для более чем 440 марок сплавов по ГОСТ. Оптимальный подбор шихтовых материалов для попадания в химический состав.',
        icon: <Calculator size={64} />,
        color: 'text-blue-400'
    },
    {
        title: 'Управление цехом',
        description: 'Электронные маршрутные листы, выдача сменных заданий рабочим, учет технологического и исправимого брака в реальном времени.',
        icon: <Factory size={64} />,
        color: 'text-orange-400'
    },
    {
        title: 'Склад и логистика',
        description: 'Строгий учет партий готовой продукции, контроль складских остатков и генерация цифровых заданий на отгрузку для кладовщиков.',
        icon: <Package size={64} />,
        color: 'text-emerald-400'
    },
    {
        title: 'Сдельная оплата',
        description: 'Прозрачный и автоматический расчет заработной платы сотрудников на основе выполненных норм, операций и произведенных партий деталей.',
        icon: <Wallet size={64} />,
        color: 'text-amber-400'
    }
];

interface PresentationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PresentationModal({ isOpen, onClose }: PresentationModalProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

    const slide = slides[currentSlide];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-neutral-800">
                    <h3 className="text-white font-medium text-lg">О системе ЛИТЭКС</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 flex flex-col items-center text-center min-h-[360px] justify-center relative">
                    {/* Navigation Buttons */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>

                    <div className="flex flex-col items-center max-w-lg transition-all duration-300">
                        <div className={`mb-6 p-4 bg-neutral-800/50 rounded-full border border-neutral-700/50 ${slide.color}`}>
                            {slide.icon}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{slide.title}</h2>
                        <p className="text-neutral-300 text-lg leading-relaxed">
                            {slide.description}
                        </p>
                    </div>
                </div>

                {/* Indicators & Footer */}
                <div className="p-6 border-t border-neutral-800 bg-neutral-800/30 flex flex-col items-center">
                    <div className="flex gap-2 mb-6">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-600 hover:bg-neutral-500'}`}
                            />
                        ))}
                    </div>

                    {currentSlide === slides.length - 1 ? (
                        <button
                            onClick={onClose}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-8 py-3 rounded-xl transition-all w-full max-w-xs shadow-lg"
                        >
                            Начать работу
                        </button>
                    ) : (
                        <button
                            onClick={nextSlide}
                            className="bg-neutral-200 hover:bg-white text-neutral-900 font-medium px-8 py-3 rounded-xl transition-all w-full max-w-xs"
                        >
                            Далее
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
