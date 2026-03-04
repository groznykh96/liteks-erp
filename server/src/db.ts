import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a single PostgreSQL connection pool
const pool = new Pool({
    connectionString: String(process.env.DATABASE_URL),
    // Setup sensible limits for connection pooling
    max: 20, // Max number of pool connections.
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Avoid adapter recreations in hot-reloading (development)
const adapter = new PrismaPg(pool);

// Determine valid Prisma Client instance
let prisma: PrismaClient;

// Add generic check for hot-reloading scenarios if used in Dev
if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({ adapter });
} else {
    // Save the client to a global object so it isn't recreated on every hot reload
    if (!(global as any).prisma) {
        (global as any).prisma = new PrismaClient({ adapter });
    }
    prisma = (global as any).prisma;
}

export default prisma;
export { pool }; // Export pool in case raw SQL is needed
