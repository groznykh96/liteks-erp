import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ShieldCheck, Calculator, Factory, Package, Wallet } from 'lucide-react';

interface Slide {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    image: string;
}

const slides: Slide[] = [
    {
        title: 'Экосистема ЛИТЭКС',
        description: 'Единая облачная платформа для полного цикла управления современным литейным производством. От справочников до отгрузки готовой продукции.',
        icon: <ShieldCheck size={28} />,
        color: 'text-indigo-400',
        image: '/screenshots/slide1.png'
    },
    {
        title: 'Умный расчет шихты',
        description: 'Автоматизированный расчет плавки для более чем 440 марок сплавов по ГОСТ. Оптимальный подбор шихтовых материалов для попадания в химический состав.',
        icon: <Calculator size={28} />,
        color: 'text-blue-400',
        image: '/screenshots/slide2.png'
    },
    {
        title: 'Управление цехом',
        description: 'Электронные маршрутные листы, выдача сменных заданий рабочим, учет технологического и исправимого брака в реальном времени.',
        icon: <Factory size={28} />,
        color: 'text-orange-400',
        image: '/screenshots/slide3.png'
    },
    {
        title: 'Склад и логистика',
        description: 'Строгий учет партий готовой продукции, контроль складских остатков и генерация цифровых заданий на отгрузку для кладовщиков.',
        icon: <Package size={28} />,
        color: 'text-emerald-400',
        image: '/screenshots/slide4.png'
    },
    {
        title: 'Сдельная оплата',
        description: 'Прозрачный и автоматический расчет заработной платы сотрудников на основе выполненных норм, операций и произведенных партий деталей.',
        icon: <Wallet size={28} />,
        color: 'text-amber-400',
        image: '/screenshots/slide5.png'
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

            <div className="relative bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-neutral-800 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-neutral-900/90 to-transparent">
                    <h3 className="text-white font-medium text-lg drop-shadow-md">О системе ЛИТЭКС</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 flex flex-col items-center text-center min-h-[500px] justify-center relative mt-12 w-full">
                    {/* Navigation Buttons */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-black/90 rounded-full text-white transition-all backdrop-blur-sm border border-white/10 z-20"
                    >
                        <ChevronLeft size={28} />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-black/90 rounded-full text-white transition-all backdrop-blur-sm border border-white/10 z-20"
                    >
                        <ChevronRight size={28} />
                    </button>

                    <div className="flex flex-col items-center w-full max-w-3xl transition-all duration-300">
                        {/* Image Showcase */}
                        <div className="w-full relative aspect-video bg-neutral-800 rounded-xl overflow-hidden mb-6 border border-neutral-700/50 shadow-2xl group">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                            />
                            {/* Slide Icon Overlay */}
                            <div className={`absolute top-4 left-4 p-3 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-neutral-700 shadow-xl ${slide.color} flex items-center justify-center transform group-hover:scale-105 transition-transform`}>
                                {slide.icon}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-neutral-900 to-transparent pointer-events-none"></div>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{slide.title}</h2>
                        <p className="text-neutral-300 text-base md:text-lg leading-relaxed max-w-2xl">
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
