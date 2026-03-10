import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Play } from 'lucide-react';

interface Slide {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
}

interface DemoOnboardingProps {
    onClose: () => void;
}

const slides: Slide[] = [
    {
        id: 1,
        title: 'Добро пожаловать в ЛИТЭКС ERP',
        content: 'Это ознакомительная презентация системы управления литейным производством. Вы находитесь в демонстрационном режиме.',
    },
    {
        id: 2,
        title: 'Рабочий стол (Dashboard)',
        content: 'Единый центр управления: ключевые метрики производства, текущие задачи и уведомления в одном месте.',
        imageUrl: 'presentation_dashboard_1773163783561.png'
    },
    {
        id: 3,
        title: 'Управление заказами',
        content: 'Полный цикл работы с заказами: от поступления заявки до отгрузки готовой продукции. Просмотр статусов и документации.',
        imageUrl: 'presentation_orders_1773163797631.png'
    },
    {
        id: 4,
        title: 'Технологический расчет (Шихта)',
        content: 'Интеллектуальная система расчета состава плавки. Учитывает химический состав материалов и требуемые параметры сплава.',
        imageUrl: 'presentation_calculator_1773163812272.png'
    },
    {
        id: 5,
        title: 'План производства',
        content: 'Инструмент для мастеров участка: планирование загрузки печей, распределение задач по позициям и контроль сроков.',
        imageUrl: 'presentation_production_1773163825573.png'
    },
    {
        id: 6,
        title: 'Контроль качества (ОТК)',
        content: 'Цифровой журнал инспекций: фиксация результатов осмотра, замеры, фотографии дефектов и автоматическая аналитика брака.',
        imageUrl: 'presentation_quality_1773163840075.png'
    },
    {
        id: 7,
        title: 'Администрирование',
        content: 'Гибкая настройка прав доступа, управление справочниками сплавов, номенклатуры и структурой предприятия.',
        imageUrl: 'presentation_admin_1773163856806.png'
    },
    {
        id: 8,
        title: 'Смена ролей (Симуляция)',
        content: 'В верхней панели вы найдете переключатель "Вид". Выберите любую должность, чтобы моментально увидеть интерфейс от лица соответствующего сотрудника.',
        imageUrl: 'presentation_roles_1773163870694.png'
    }
];

const DemoOnboarding: React.FC<DemoOnboardingProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const next = () => {
        if (currentStep < slides.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                            <Play size={20} fill="currentColor" />
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Презентация системы</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-8 min-h-[450px] flex-1 flex flex-col items-center text-center">
                    {slides[currentStep].imageUrl && (
                        <div className="w-full h-64 bg-neutral-800 rounded-xl overflow-hidden mb-6 border border-neutral-700 shadow-inner flex items-center justify-center group">
                            <img 
                                src={`/demo-assets/${slides[currentStep].imageUrl}`} 
                                alt={slides[currentStep].title}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    )}
                    
                    {!slides[currentStep].imageUrl && (
                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-8 text-yellow-500 border border-neutral-700">
                            <span className="text-3xl font-bold">{currentStep + 1}</span>
                        </div>
                    )}
                    
                    <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{slides[currentStep].title}</h3>
                    <p className="text-neutral-400 text-lg leading-relaxed max-w-xl">
                        {slides[currentStep].content}
                    </p>
                    
                    {/* Progress dots */}
                    <div className="flex gap-2 mt-12">
                        {slides.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-yellow-500' : 'w-2 bg-neutral-700'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 bg-neutral-950/50 border-t border-neutral-800 flex items-center justify-between shrink-0">
                    <button 
                        onClick={prev}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentStep === 0 ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-300 hover:bg-neutral-800'}`}
                    >
                        <ChevronLeft size={20} />
                        Назад
                    </button>
                    
                    <button 
                        onClick={next}
                        className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/10 active:scale-95"
                    >
                        {currentStep === slides.length - 1 ? 'Начать работу' : 'Далее'}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DemoOnboarding;
