import axios from 'axios';
import { DEFAULT_ALLOYS, DEFAULT_MATERIALS } from './fallbackData';

import API_URL from './config';

// Create a configured axios instance that automatically uses the auth token if available
const apiClient = axios.create({
    baseURL: API_URL
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const api = {
    getAlloys: async () => {
        try {
            const res = await apiClient.get('/alloys');
            return res.data;
        } catch (e) {
            console.error('Failed to get alloys from server, using fallback');
            return DEFAULT_ALLOYS;
        }
    },
    getMaterials: async () => {
        try {
            const res = await apiClient.get('/materials');
            return res.data;
        } catch (e) {
            console.error('Failed to get materials from server, using fallback');
            return DEFAULT_MATERIALS;
        }
    },
    getNomenclature: async () => {
        try {
            const res = await apiClient.get('/nomenclature');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    getMelts: async () => {
        try {
            const res = await apiClient.get('/melts');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveMelt: async (melt: any) => {
        await apiClient.post('/melts', melt);
    },
    deleteMelt: async (id: number) => {
        await apiClient.delete(`/melts/${id}`);
    },
    saveMeltConclusion: async (meltId: number, data: any) => {
        const res = await apiClient.post(`/melts/${meltId}/conclusion`, data);
        return res.data;
    },
    saveNomenclature: async (item: any) => {
        await apiClient.post('/nomenclature', item);
    },
    deleteNomenclature: async (id: number) => {
        await apiClient.delete(`/nomenclature/${id}`);
    },
    saveMaterial: async (item: any) => {
        await apiClient.post('/materials', item);
    },
    deleteMaterial: async (id: number) => {
        await apiClient.delete(`/materials/${id}`);
    },
    saveAlloy: async (item: any) => {
        await apiClient.post('/alloys', item);
    },
    deleteAlloy: async (id: number) => {
        await apiClient.delete(`/alloys/${id}`);
    },
    getMethods: async () => {
        try {
            const res = await apiClient.get('/methods');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    getUsers: async () => {
        try {
            const res = await apiClient.get('/users');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    getTasks: async (params?: { assignedToUserId?: number; status?: string }) => {
        try {
            let url = '/tasks';
            if (params) {
                const searchParams = new URLSearchParams();
                if (params.assignedToUserId) searchParams.append('assignedToUserId', params.assignedToUserId.toString());
                if (params.status) searchParams.append('status', params.status);
                url += `?${searchParams.toString()}`;
            }
            const res = await apiClient.get(url);
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveTask: async (task: any) => {
        const res = await apiClient.post('/tasks', task);
        return res.data;
    },
    updateTask: async (id: number, data: any) => {
        const res = await apiClient.put(`/tasks/${id}`, data);
        return res.data;
    },
    deleteTask: async (id: number) => {
        await apiClient.delete(`/tasks/${id}`);
    },
    getPlans: async () => {
        try {
            const res = await apiClient.get('/plan');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    savePlan: async (plan: any) => {
        const res = await apiClient.post('/plan', plan);
        return res.data;
    },
    deletePlan: async (id: number) => {
        await apiClient.delete(`/plan/${id}`);
    },
    getInspections: async () => {
        try {
            const res = await apiClient.get('/inspections');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveInspection: async (data: any) => {
        const res = await apiClient.post('/inspections', data);
        return res.data;
    },
    getBatches: async (params?: { taskId?: number; workerId?: number }) => {
        try {
            let url = '/batches';
            if (params) {
                const searchParams = new URLSearchParams();
                if (params.taskId) searchParams.append('taskId', params.taskId.toString());
                if (params.workerId) searchParams.append('workerId', params.workerId.toString());
                url += `?${searchParams.toString()}`;
            }
            const res = await apiClient.get(url);
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveBatch: async (batch: any) => {
        const res = await apiClient.post('/batches', batch);
        return res.data;
    },
    getQCReports: async (params?: { batchId?: number }) => {
        try {
            let url = '/qc';
            if (params && params.batchId) {
                url += `?batchId=${params.batchId}`;
            }
            const res = await apiClient.get(url);
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveQCReport: async (report: any) => {
        const res = await apiClient.post('/qc', report);
        return res.data;
    },
    getStatisticsDefects: async () => {
        try {
            const res = await apiClient.get('/statistics/defects');
            return res.data;
        } catch (e) {
            return { byDepartment: [], total: 0, raw: [] };
        }
    },
    getStatisticsCosts: async () => {
        try {
            const res = await apiClient.get('/statistics/costs');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    getStatisticsProductivity: async () => {
        try {
            const res = await apiClient.get('/statistics/productivity');
            return res.data;
        } catch (e) {
            return { byDepartment: [] };
        }
    },
    getStatisticsWorkers: async () => {
        try {
            const res = await apiClient.get('/statistics/workers');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    getDirectorTasks: async () => {
        try {
            const res = await apiClient.get('/director-tasks');
            return res.data;
        } catch (e) {
            return [];
        }
    },
    saveDirectorTask: async (task: any) => {
        const res = await apiClient.post('/director-tasks', task);
        return res.data;
    },
    updateDirectorTask: async (id: number, data: any) => {
        const res = await apiClient.put(`/director-tasks/${id}`, data);
        return res.data;
    },
    deleteDirectorTask: async (id: number) => {
        await apiClient.delete(`/director-tasks/${id}`);
    },
    addDirectorTaskComment: async (taskId: number, text: string) => {
        const res = await apiClient.post(`/director-tasks/${taskId}/comments`, { text });
        return res.data;
    },

    // --- SALES ORDERS ---
    getOrders: async () => {
        try {
            const res = await apiClient.get('/orders');
            return res.data;
        } catch (e) { return []; }
    },
    createOrder: async (data: any) => {
        const res = await apiClient.post('/orders', data);
        return res.data;
    },
    updateOrder: async (id: number, data: any) => {
        const res = await apiClient.put(`/orders/${id}`, data);
        return res.data;
    },
    deleteOrder: async (id: number) => {
        await apiClient.delete(`/orders/${id}`);
    },
    updateOrderStage: async (orderId: number, stageId: number, data: any) => {
        const res = await apiClient.put(`/orders/${orderId}/stages/${stageId}`, data);
        return res.data;
    },
    addOrderComment: async (orderId: number, text: string) => {
        const res = await apiClient.post(`/orders/${orderId}/comments`, { text });
        return res.data;
    },
    getOrdersStats: async () => {
        try {
            const res = await apiClient.get('/orders/stats/summary');
            return res.data;
        } catch (e) { return null; }
    },

    // --- TRAINING ---
    getTrainingMaterials: async () => {
        const res = await apiClient.get('/training');
        return res.data;
    },
    createTrainingMaterial: async (data: any) => {
        const res = await apiClient.post('/training', data);
        return res.data;
    },
    deleteTrainingMaterial: async (id: number) => {
        const res = await apiClient.delete(`/training/${id}`);
        return res.data;
    },
    getMyTraining: async () => {
        const res = await apiClient.get('/training/my');
        return res.data;
    },
    markTrainingAsRead: async (assignmentId: number) => {
        const res = await apiClient.post(`/training/my/${assignmentId}/read`);
        return res.data;
    },
    getCompetencyMatrix: async () => {
        const res = await apiClient.get('/training/matrix');
        return res.data;
    },
    getTrainingUsers: async () => {
        const res = await apiClient.get('/training/users-list');
        return res.data;
    },
    getRelevantTrainingMaterials: async () => {
        const res = await apiClient.get('/training/materials/relevant');
        return res.data;
    },
    resetTrainingAssignment: async (assignmentId: number) => {
        const res = await apiClient.post(`/training/assignments/${assignmentId}/reset`);
        return res.data;
    },
    assignMoreTraining: async (materialId: number, data: any) => {
        const res = await apiClient.post(`/training/${materialId}/assign`, data);
        return res.data;
    },

    // --- WAREHOUSE ---
    getWarehouseInventory: async () => {
        const res = await apiClient.get('/warehouse/inventory');
        return res.data;
    },
    moveWarehouseItem: async (data: any) => {
        const res = await apiClient.post('/warehouse/move', data);
        return res.data;
    },
    addWarehouseItem: async (data: { nomId: string | number, quantity: number, location: string, batchId?: string | number }) => {
        const res = await apiClient.post('/warehouse/add', data);
        return res.data;
    },

    // --- SHIPPING ---
    getShippingOrders: async () => {
        const res = await apiClient.get('/shipping');
        return res.data;
    },
    createShippingOrder: async (data: any) => {
        const res = await apiClient.post('/shipping', data);
        return res.data;
    },
    pickShippingItem: async (id: number, data: any) => {
        const res = await apiClient.post(`/shipping/${id}/pick`, data);
        return res.data;
    },
    shipShippingOrder: async (id: number) => {
        const res = await apiClient.post(`/shipping/${id}/ship`);
        return res.data;
    },
    confirmShippingOrder: async (id: number) => {
        const res = await apiClient.post(`/shipping/${id}/confirm`);
        return res.data;
    },
    getShippingEmployees: async () => {
        const res = await apiClient.get('/shipping/employees');
        return res.data;
    },

    // --- SALARY ---
    getSalaryReport: async (params?: { startDate?: string; endDate?: string; workerId?: number }) => {
        let url = '/salary/report';
        if (params) {
            const searchParams = new URLSearchParams();
            if (params.startDate) searchParams.append('startDate', params.startDate);
            if (params.endDate) searchParams.append('endDate', params.endDate);
            if (params.workerId) searchParams.append('workerId', params.workerId.toString());
            url += `?${searchParams.toString()}`;
        }
        const res = await apiClient.get(url);
        return res.data;
    },

    // --- STAGES ---
    getMyStages: async () => {
        const res = await apiClient.get('/stages/my');
        return res.data;
    },
    startStage: async (id: number) => {
        const res = await apiClient.post(`/stages/${id}/start`);
        return res.data;
    },
    completeStage: async (id: number, data: { qtyOut: number, qtyRejected?: number, note?: string, newBatchNumber?: string }) => {
        const res = await apiClient.post(`/stages/${id}/complete`, data);
        return res.data;
    },
    getStagesBoard: async () => {
        const res = await apiClient.get('/stages/board');
        return res.data;
    },
    getStagesStats: async (params?: { from?: string; to?: string }) => {
        let url = '/stages/stats';
        if (params?.from || params?.to) {
            const searchParams = new URLSearchParams();
            if (params.from) searchParams.append('from', params.from);
            if (params.to) searchParams.append('to', params.to);
            url += `?${searchParams.toString()}`;
        }
        const res = await apiClient.get(url);
        return res.data;
    },
    assignStageWorker: async (id: number, data: { workerId: number | null }) => {
        const res = await apiClient.put(`/stages/${id}/assign`, data);
        return res.data;
    },

    // --- DEPARTMENTS ---
    getDepartments: async () => {
        const res = await apiClient.get('/departments');
        return res.data;
    },
    saveDepartment: async (data: { id?: number, name: string }) => {
        const res = await apiClient.post('/departments', data);
        return res.data;
    },
    deleteDepartment: async (id: number) => {
        const res = await apiClient.delete(`/departments/${id}`);
        return res.data;
    }
};
