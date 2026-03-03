"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db = null;
function initDB() {
    const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'litex-seo.sqlite');
    db = new better_sqlite3_1.default(dbPath, { verbose: console.log });
    // Ensure schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            C REAL, Si REAL, Mn REAL, Cr REAL, Ni REAL, S REAL, P REAL, Cu REAL,
            price REAL,
            assimilation REAL
        );
        CREATE TABLE IF NOT EXISTS alloys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            C_min REAL, C_max REAL,
            Si_min REAL, Si_max REAL,
            Mn_min REAL, Mn_max REAL,
            Cr_min REAL, Cr_max REAL,
            Ni_min REAL, Ni_max REAL,
            S_max REAL, P_max REAL, Cu_max REAL
        );
        CREATE TABLE IF NOT EXISTS nomenclature (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            group_name TEXT,
            exitMass REAL,
            goodMass REAL,
            tvgNorm REAL,
            note TEXT
        );
        CREATE TABLE IF NOT EXISTS melts (
            id INTEGER PRIMARY KEY,
            meltNumber TEXT NOT NULL,
            date TEXT NOT NULL,
            alloyId INTEGER,
            totalCost REAL,
            meltMass REAL,
            note TEXT,
            castings_json TEXT -- Storing related castings as JSON array for simplicity
        );
    `);
    // Add initial data if empty
    const stmt = db.prepare('SELECT count(*) as count FROM alloys');
    const row = stmt.get();
    if (row.count === 0) {
        // Insert standard initial data (dummy for now, we'll implement via IPC if needed)
        db.prepare("INSERT INTO alloys (name, C_min, C_max, Si_min, Si_max, Mn_min, Mn_max, Cr_min, Cr_max, Ni_min, Ni_max, S_max, P_max, Cu_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run('20ГЛ', 0.15, 0.25, 0.20, 0.40, 1.20, 1.60, 0.0, 0.30, 0.0, 0.30, 0.04, 0.04, 0.30);
    }
}
function getAlloys() {
    if (!db)
        return [];
    return db.prepare('SELECT * FROM alloys').all();
}
function getMaterials() {
    if (!db)
        return [];
    return db.prepare('SELECT * FROM materials').all();
}
function getNomenclature() {
    if (!db)
        return [];
    return db.prepare('SELECT * FROM nomenclature').all();
}
function getMelts() {
    if (!db)
        return [];
    return db.prepare('SELECT * FROM melts ORDER BY date DESC').all();
}
function saveMelt(melt) {
    if (!db)
        return;
    const stmt = db.prepare(`
        INSERT INTO melts (id, meltNumber, date, alloyId, totalCost, meltMass, note, castings_json)
        VALUES (@id, @meltNumber, @date, @alloyId, @totalCost, @meltMass, @note, @castings_json)
    `);
    stmt.run({
        id: melt.id,
        meltNumber: melt.meltNumber,
        date: melt.date,
        alloyId: melt.alloyId,
        totalCost: melt.totalCost,
        meltMass: melt.meltMass,
        note: melt.note,
        castings_json: JSON.stringify(melt.castings || [])
    });
}
function deleteMelt(id) {
    if (!db)
        return;
    db.prepare('DELETE FROM melts WHERE id = ?').run(id);
}
exports.default = { initDB, getAlloys, getMaterials, getNomenclature, getMelts, saveMelt, deleteMelt };
