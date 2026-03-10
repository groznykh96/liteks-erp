export class DemoService {
    static getMockOrders() {
        return [
            {
                id: 1001,
                orderNumber: 'ЗАК-2026-DEMO1',
                clientName: 'ООО "Альфа-Пром"',
                status: 'IN_PRODUCTION',
                deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
                totalAmount: 150000,
                createdBy: { fullName: 'Менеджер Демо' },
                items: [{ id: 1, itemName: 'Деталь Корпуса А1', quantity: 50, alloyName: 'АК7ч' }],
                stages: [{ id: 1, label: 'Плавка', status: 'COMPLETED' }, { id: 2, label: 'Литье', status: 'IN_PROGRESS' }],
                comments: []
            },
            {
                id: 1002,
                orderNumber: 'ЗАК-2026-DEMO2',
                clientName: 'ИП Петров В.В.',
                status: 'NEW',
                deadline: new Date(Date.now() + 86400000 * 10).toISOString(),
                totalAmount: 45000,
                createdBy: { fullName: 'Менеджер Демо' },
                items: [{ id: 2, itemName: 'Втулка Б2', quantity: 100, alloyName: 'БрАЖ9-4' }],
                stages: [{ id: 3, label: 'Плавка', status: 'PENDING' }],
                comments: []
            }
        ];
    }

    static getMockMelts() {
        return [
            {
                id: 1,
                meltNumber: 'ПЛ-26-001',
                alloyId: 1,
                meltMass: 1000,
                totalCost: 50000,
                alloy: { name: 'АК7ч' },
                weight: 500,
                date: new Date().toISOString(),
                calculateDate: new Date().toISOString(),
                status: 'COMPLETED',
                composition: { Si: 7.2, Mg: 0.35, Fe: 0.15 },
                castings: [
                    { nomId: 1, qty: 50, exitMassFact: 12.5, goodMassFact: 10, tvgFact: 80, note: '' }
                ],
                conclusion: {
                    chemistryStatus: 'В норме',
                    mechanicalStatus: 'В норме',
                    finalVerdict: 'Годна',
                    employee: { fullName: 'ОТК Демо' }
                }
            }
        ];
    }

    static getMockStatistics() {
        return {
            total: 2,
            byStatus: [{ status: 'IN_PRODUCTION', _count: { status: 1 } }, { status: 'NEW', _count: { status: 1 } }],
            overdue: 0
        };
    }

    static getMockInventory() {
        return [
            { id: 1, nomenclature: { name: 'Алюминиевый лом', code: 'СЫР-001' }, quantity: 1200, location: 'Склад А' },
            { id: 2, nomenclature: { name: 'Сплав АК7ч в чушках', code: 'СПЛ-002' }, quantity: 850, location: 'Склад Б' }
        ];
    }

    static getMockDefects() {
        return {
            byDepartment: [{ name: 'Литейный цех', value: 12 }, { name: 'Мехобработка', value: 5 }],
            total: 17,
            raw: []
        };
    }

    static getMockCosts() {
        return [
            { id: 1, meltNumber: 'ПЛ-001', date: new Date(), alloy: 'АК7ч', totalCost: 50000, totalGoodMass: 450, costPerKg: 111.11 },
            { id: 2, meltNumber: 'ПЛ-002', date: new Date(), alloy: 'АК12', totalCost: 65000, totalGoodMass: 600, costPerKg: 108.33 }
        ];
    }

    static getMockProductivity() {
        return {
            byDepartment: [{ name: 'Литейный цех', value: 4500 }, { name: 'Мехобработка', value: 3200 }]
        };
    }

    static getMockWorkers() {
        return [
            { id: 201, fullName: 'Иванов Иван', department: 'Литейный цех', totalMelts: 45, acceptedQty: 850, rejectedQty: 12 },
            { id: 202, fullName: 'Петров Петр', department: 'Мехобработка', totalMelts: 30, acceptedQty: 600, rejectedQty: 5 }
        ];
    }

    static getMockAlloys() {
        return [{ id: 1, name: 'АК7ч', description: 'Силумин с повышенной чистотой' }, { id: 2, name: 'АК12', description: 'Эвтектический силумин' }];
    }

    static getMockMaterials() {
        return [{ id: 1, name: 'Чушка АК7ч', chemistry: 'Si: 7%, Mg: 0.3%' }, { id: 2, name: 'Лом алюминия', chemistry: 'Mix' }];
    }

    static getMockNomenclature() {
        return [{ id: 1, name: 'Корпус насоса А12', drawingNumber: '12-054-01', goodMass: 4.5, castingMethod: { name: 'ХТС' } }];
    }

    static getMockTasks() {
        return [
            { 
                id: 1, 
                taskNumber: 'T-2026-001',
                nomenclature: { code: 'АЛ-001', name: 'Корпус насоса' },
                method: { name: 'ХТС' },
                quantity: 150,
                status: 'IN_PROGRESS', 
                priority: 'HIGH', 
                worker: { fullName: 'Иванов И.' }, 
                department: 'Литейный цех',
                createdAt: new Date().toISOString()
            },
            { 
                id: 2, 
                taskNumber: 'T-2026-002',
                nomenclature: { code: 'АЛ-002', name: 'Втулка' },
                method: { name: 'Кокиль' },
                quantity: 45,
                status: 'NEW', 
                priority: 'NORMAL', 
                worker: { fullName: 'Петров П.' }, 
                department: 'Обрубной участок',
                createdAt: new Date().toISOString()
            }
        ];
    }

    static getMockPlan() {
        return [
            { 
                id: 1, 
                nomenclature: { id: 1, name: 'Корпус А1', code: 'АЛ-001' }, 
                method: { id: 1, name: 'ХТС' },
                plannedQuantity: 100, 
                actualQty: 45, 
                planDate: new Date().toISOString().split('T')[0],
                priority: 2,
                status: 'NEW',
                tasks: [
                    { id: 101, taskNumber: 'T-2026-001', quantity: 45 }
                ]
            }
        ];
    }

    static getMockInspections() {
        return [
            { 
                id: 1, 
                batch: { 
                    batchNumber: 'DEMO-778', 
                    task: { nomenclature: { code: 'АЛ-001', name: 'Корпус А1' } },
                    worker: { fullName: 'Иванов И.' }
                }, 
                inspectionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                status: 'PENDING', 
                acceptedQty: 0,
                rejectedQty: 0,
            },
            { 
                id: 2, 
                batch: { 
                    batchNumber: 'DEMO-775', 
                    task: { nomenclature: { code: 'АЛ-002', name: 'Втулка Б2' } },
                    worker: { fullName: 'Петров П.' }
                }, 
                inspectionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                status: 'COMPLETED', 
                result: 'ACCEPTED', 
                acceptedQty: 50, 
                rejectedQty: 2,
                inspector: { fullName: 'Смирнов С.' }
            }
        ];
    }

    static getMockShipping() {
        return [
            { id: 1, orderNumber: 'ЗАК-2026-DEMO1', client: 'ООО "Альфа-Пром"', status: 'READY_TO_SHIP' }
        ];
    }

    static getMockSalary() {
        return [
            { id: 1, workerName: 'Иванов Иван', period: 'Март 2026', baseSalary: 45000, bonus: 12500, total: 57500 }
        ];
    }

    static getMockBatches() {
        return [
            {
                id: 1,
                batchNumber: 'DEMO-100',
                currentStageLabel: 'Заливка',
                completedQuantity: 50,
                meltsCount: 2,
                pouringTemp: 710,
                moldTemp: 220,
                createdAt: new Date().toISOString(),
                task: { 
                    taskNumber: 'T-2026-001',
                    nomenclature: { code: 'АЛ-001', name: 'Корпус насоса' }, 
                    method: { name: 'ХТС' } 
                },
                qcReports: [],
                stages: [
                    { id: 101, stageLabel: 'Формовка', status: 'DONE', qtyIn: 50, qtyOut: 50, worker: { fullName: 'Иванов И.' } },
                    { id: 102, stageLabel: 'Заливка', status: 'IN_PROGRESS', worker: null }
                ]
            }
        ];
    }

    static getMockStages() {
        return [
            {
                id: 1,
                stage: 'POURING',
                stageLabel: 'Заливка',
                status: 'PENDING',
                qtyIn: 50,
                batch: {
                    id: 1,
                    batchNumber: 'DEMO-100',
                    route: 'HTS',
                    task: { nomenclature: { code: 'АЛ-001', name: 'Корпус насоса' }, method: { name: 'ХТС' } },
                    stages: [
                        { id: 101, stage: 'FORMING', stageLabel: 'Формовка', status: 'DONE', qtyIn: 50, qtyOut: 50, qtyRejected: 0, worker: { fullName: 'Иванов И.' } },
                        { id: 102, stage: 'POURING', stageLabel: 'Заливка', status: 'PENDING', qtyIn: 50, qtyOut: null, qtyRejected: null }
                    ]
                },
                nextStageLabel: 'Выбивка'
            }
        ];
    }
}
