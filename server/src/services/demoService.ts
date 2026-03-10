export class DemoService {
    static getMockOrders() {
        return [
            {
                id: 1001,
                orderNumber: 'ЗАК-2026-DEMO1',
                clientName: 'ООО "Альфа-Пром"',
                status: 'IN_PRODUCTION',
                deadline: new Date(Date.now() + 86400000 * 5),
                totalAmount: 150000,
                items: [{ id: 1, itemName: 'Деталь Корпуса А1', quantity: 50, alloyName: 'АК7ч' }],
                stages: [{ id: 1, label: 'Плавка', status: 'COMPLETED' }, { id: 2, label: 'Литье', status: 'IN_PROGRESS' }]
            },
            {
                id: 1002,
                orderNumber: 'ЗАК-2026-DEMO2',
                clientName: 'ИП Петров В.В.',
                status: 'NEW',
                deadline: new Date(Date.now() + 86400000 * 10),
                totalAmount: 45000,
                items: [{ id: 2, itemName: 'Втулка Б2', quantity: 100, alloyName: 'БрАЖ9-4' }],
                stages: [{ id: 3, label: 'Плавка', status: 'PENDING' }]
            }
        ];
    }

    static getMockMelts() {
        return [
            {
                id: 1,
                alloy: { name: 'АК7ч' },
                weight: 500,
                calculateDate: new Date(),
                status: 'COMPLETED',
                composition: { Si: 7.2, Mg: 0.35, Fe: 0.15 }
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
            { id: 1, nomenclature: { name: 'Алюминиевый лом' }, quantity: 1200, location: 'Склад А' },
            { id: 2, nomenclature: { name: 'Сплав АК7ч в чушках' }, quantity: 850, location: 'Склад Б' }
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
            { id: 1, title: 'Заливка партии #778', status: 'IN_PROGRESS', priority: 'HIGH', worker: { fullName: 'Иванов И.' }, department: 'Литейный цех' },
            { id: 2, title: 'Обрубка отливок ЗАК-102', status: 'NEW', priority: 'NORMAL', worker: { fullName: 'Петров П.' }, department: 'Обрубной участок' }
        ];
    }

    static getMockPlan() {
        return [
            { id: 1, nomenclature: 'Корпус А1', plannedQty: 100, actualQty: 45, startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 3) }
        ];
    }

    static getMockInspections() {
        return [
            { id: 1, batchNumber: '778', nomenclature: 'Корпус А1', status: 'PEDNING', createdAt: new Date() },
            { id: 2, batchNumber: '775', nomenclature: 'Втулка Б2', status: 'COMPLETED', result: 'ACCEPTED', goodQty: 50, badQty: 2 }
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
}
