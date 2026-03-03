const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function initDB() {
    let dbPath;
    try {
        dbPath = path.join(app.getPath('userData'), 'litex-seo.sqlite');
    } catch {
        // Fallback for seed script execution outside full electron boot
        dbPath = path.join(__dirname, 'litex-seo.sqlite');
    }
    db = new Database(dbPath, { verbose: console.log });

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
    if (!db) return [];
    return db.prepare('SELECT * FROM alloys').all();
}

function getMaterials() {
    if (!db) return [];
    return db.prepare('SELECT * FROM materials').all();
}

function getNomenclature() {
    if (!db) return [];
    return db.prepare('SELECT * FROM nomenclature').all();
}

function getMelts() {
    if (!db) return [];
    return db.prepare('SELECT * FROM melts ORDER BY date DESC').all();
}

function saveMelt(melt) {
    if (!db) return;
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
    if (!db) return;
    db.prepare('DELETE FROM melts WHERE id = ?').run(id);
}

function saveNomenclature(item) {
    if (!db) return;
    if (item.id) {
        db.prepare('UPDATE nomenclature SET code=@code, name=@name, group_name=@group, exitMass=@exitMass, goodMass=@goodMass, tvgNorm=@tvgNorm, note=@note WHERE id=@id').run(item);
    } else {
        db.prepare('INSERT INTO nomenclature (code, name, group_name, exitMass, goodMass, tvgNorm, note) VALUES (@code, @name, @group, @exitMass, @goodMass, @tvgNorm, @note)').run(item);
    }
}
function deleteNomenclature(id) {
    if (!db) return;
    db.prepare('DELETE FROM nomenclature WHERE id = ?').run(id);
}
function saveMaterial(m) {
    if (!db) return;
    if (m.id) {
        db.prepare('UPDATE materials SET name=@name, C=@C, Si=@Si, Mn=@Mn, Cr=@Cr, Ni=@Ni, S=@S, P=@P, Cu=@Cu, price=@price, assimilation=@assimilation WHERE id=@id').run(m);
    } else {
        db.prepare('INSERT INTO materials (name, C, Si, Mn, Cr, Ni, S, P, Cu, price, assimilation) VALUES (@name, @C, @Si, @Mn, @Cr, @Ni, @S, @P, @Cu, @price, @assimilation)').run(m);
    }
}
function deleteMaterial(id) {
    if (!db) return; db.prepare('DELETE FROM materials WHERE id = ?').run(id);
}
function saveAlloy(a) {
    if (!db) return;
    if (a.id) {
        db.prepare('UPDATE alloys SET name=@name, C_min=@C_min, C_max=@C_max, Si_min=@Si_min, Si_max=@Si_max, Mn_min=@Mn_min, Mn_max=@Mn_max, Cr_min=@Cr_min, Cr_max=@Cr_max, Ni_min=@Ni_min, Ni_max=@Ni_max, S_max=@S_max, P_max=@P_max, Cu_max=@Cu_max WHERE id=@id').run(a);
    } else {
        db.prepare('INSERT INTO alloys (name, C_min, C_max, Si_min, Si_max, Mn_min, Mn_max, Cr_min, Cr_max, Ni_min, Ni_max, S_max, P_max, Cu_max) VALUES (@name, @C_min, @C_max, @Si_min, @Si_max, @Mn_min, @Mn_max, @Cr_min, @Cr_max, @Ni_min, @Ni_max, @S_max, @P_max, @Cu_max)').run(a);
    }
}
function deleteAlloy(id) {
    if (!db) return; db.prepare('DELETE FROM alloys WHERE id = ?').run(id);
}

module.exports = { initDB, getAlloys, getMaterials, getNomenclature, getMelts, saveMelt, deleteMelt, saveNomenclature, deleteNomenclature, saveMaterial, deleteMaterial, saveAlloy, deleteAlloy };
