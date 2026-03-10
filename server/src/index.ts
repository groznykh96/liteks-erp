import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import { authenticateToken } from './middlewares/authMiddleware';
import { demoGuard } from './middlewares/demoGuard';

dotenv.config();

import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import usersRouter from './routes/users';
import apiRouter from './routes/api';
import planRouter from './routes/plan';
import inspectionsRouter from './routes/inspections';
import batchesRouter from './routes/batches';
import qcRouter from './routes/qc';
import statisticsRouter from './routes/statistics';
import directorTasksRouter from './routes/directorTasks';
import ordersRouter from './routes/orders';
import instructionsRouter from './routes/instructions';
import trainingRouter from './routes/training';
import adminRouter from './routes/admin';
import warehouseRouter from './routes/warehouse';
import shippingRouter from './routes/shipping';
import salaryRouter from './routes/salary';
import stagesRouter from './routes/stages';
import departmentsRouter from './routes/departments';

import { pool } from './db';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
            .split(',')
            .map(s => s.trim());
        if (allowed.includes('*') || allowed.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now — tighten in production if needed
        }
    },
    credentials: true
}));
app.use(express.json());

// Auth routes don't need demo guard
app.use('/api/auth', authRouter);

// Apply demo guard to all subsequent API routes
app.use(demoGuard);

app.use('/api/users', usersRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/plan', planRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/qc', qcRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/director-tasks', directorTasksRouter);
app.use('/api/orders', ordersRouter);
// Instructions must be mounted BEFORE the generic /api router (which has global auth)
app.use('/api/instructions', instructionsRouter);
app.use('/api/training', trainingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/stages', stagesRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Foundry ERP Backend is running' });
});

// Generic /api router last — it applies global auth to everything it handles
app.use('/api', apiRouter);

app.listen(PORT, () => {
    console.log(`Backend server started on http://localhost:${PORT}`);
});
