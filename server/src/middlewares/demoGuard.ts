import { Request, Response, NextFunction } from 'express';

export const demoGuard = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // Only allow GET requests for DEMO users
    if (user && user.role === 'DEMO') {
        if (req.method !== 'GET') {
            return res.status(403).json({ 
                error: 'ДЕМО-РЕЖИМ: Внесение изменений невозможно. Эта функция доступна только для чтения.' 
            });
        }
    }
    
    next();
};
