import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();
const pool = new Pool({ connectionString: String(process.env.DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const dbPath = path.resolve(__dirname, '../../litex-seo.sqlite');
console.log('Reading from SQLite:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening SQLite DB', err);
        process.exit(1);
    }
});

// Helper to wrap sqlite queries in Promises
const query = (sql: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function main() {
    console.log('--- Starting Migration ---');

    console.log('1. Migrating Materials (Nomenclature & Settings)...');
    const materials = await query('SELECT * FROM Materials');
    console.log(`Found ${materials.length} Materials.`);
    for (const mat of materials) {
        await prisma.material.upsert({
            where: { id: mat.id },
            update: {
                name: mat.name,
                price: parseFloat(mat.price) || 0,
            },
            create: {
                id: mat.id,
                name: mat.name,
                price: parseFloat(mat.price) || 0,
            }
        });
    }

    console.log('2. Migrating Alloys...');
    const alloys = await query('SELECT * FROM Alloys');
    console.log(`Found ${alloys.length} Alloys.`);
    for (const alloy of alloys) {
        let compositionInfo = '';
        try {
            // Some versions of the old app saved composition directly into the alloys table 
            // The JSON might be in 'elements' or we might need to query 'AlloyElements' if that exists
            // We'll just save the raw row for now if there is extra info in 'elements' column
            if (alloy.elements) {
                compositionInfo = alloy.elements;
            }
        } catch (e) { }

        try {
            await prisma.alloy.upsert({
                where: { id: alloy.id },
                update: {
                    name: alloy.name,
                },
                create: {
                    id: alloy.id,
                    name: alloy.name,
                }
            });
        } catch (e) {
            console.warn(`[WARN] Skipping Alloy ID ${alloy.id} ('${alloy.name}') due to unique constraint or other error.`);
        }
    }

    console.log('3. Migrating Ledger (Melts)...');
    const melts = await query('SELECT * FROM Melts');
    console.log(`Found ${melts.length} Melts.`);

    // Create a generic historical Nomenclature
    const histNom = await prisma.nomenclature.upsert({
        where: { id: 99999 },
        update: {},
        create: {
            id: 99999,
            code: 'HIST',
            name: 'Исторические данные',
            exitMass: 1,
            goodMass: 1,
        }
    });

    // Create a generic completed task to link past melts to
    const defaultTask = await prisma.task.upsert({
        where: { taskNumber: 'HIST-001' },
        update: {},
        create: {
            taskNumber: 'HIST-001',
            partCodeId: histNom.id,
            methodId: 1, // Assumes method 1 (XTC) exists from seeder
            quantity: 1,
            status: 'DONE',
        }
    });

    for (const melt of melts) {
        let dateStr = melt.date_time ? String(melt.date_time) : new Date().toISOString();

        try {
            await prisma.melt.upsert({
                where: { meltNumber: String(melt.id) },
                update: {
                    date: dateStr,
                    alloyId: alloys.length > 0 ? (melt.alloy_id || alloys[0].id) : 1,
                    totalCost: parseFloat(melt.total_cost) || 0,
                    meltMass: parseFloat(melt.melt_mass) || 100,
                    note: typeof melt.ingredients === 'string' ? melt.ingredients : JSON.stringify(melt.ingredients || []),
                },
                create: {
                    meltNumber: String(melt.id),
                    date: dateStr,
                    alloyId: alloys.length > 0 ? (melt.alloy_id || alloys[0].id) : 1,
                    totalCost: parseFloat(melt.total_cost) || 0,
                    meltMass: parseFloat(melt.melt_mass) || 100,
                    note: typeof melt.ingredients === 'string' ? melt.ingredients : JSON.stringify(melt.ingredients || []),
                }
            });
        } catch (e) {
            console.warn(`[WARN] Skipping Melt ID ${melt.id} due to constraint violation.`);
        }
    }

    console.log('--- Migration Complete! ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        db.close();
    });
