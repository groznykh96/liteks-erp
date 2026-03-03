const db = require('../electron-db.js');

const DEFAULT_MATERIALS = [
    { name: 'Возврат 12Х18Н9ТЛ', C: 0.12, Si: 1.00, Mn: 1.00, Cr: 18.0, Ni: 9.0, S: 0.015, P: 0.020, Cu: 0.1, price: 0, assimilation: 100 },
    { name: 'Лом 12Х18Н9ТЛ', C: 0.12, Si: 0.80, Mn: 1.50, Cr: 18.0, Ni: 9.0, S: 0.020, P: 0.025, Cu: 0.2, price: 150, assimilation: 100 },
    { name: 'ФС45', C: 0.10, Si: 45.0, Mn: 0.60, Cr: 0.00, Ni: 0.0, S: 0.02, P: 0.04, Cu: 0.0, price: 120, assimilation: 85 },
    { name: 'Мн95', C: 0.10, Si: 0.30, Mn: 95.0, Cr: 0.00, Ni: 0.0, S: 0.05, P: 0.05, Cu: 0.0, price: 180, assimilation: 90 },
    { name: 'ФХ005', C: 0.05, Si: 1.50, Mn: 0.00, Cr: 65.0, Ni: 0.0, S: 0.02, P: 0.03, Cu: 0.0, price: 210, assimilation: 95 },
    { name: 'ФХ025', C: 0.25, Si: 1.50, Mn: 0.00, Cr: 65.0, Ni: 0.0, S: 0.02, P: 0.03, Cu: 0.0, price: 200, assimilation: 95 },
    { name: 'Х20Н80', C: 0.05, Si: 0.40, Mn: 0.30, Cr: 20.0, Ni: 80.0, S: 0.01, P: 0.01, Cu: 0.0, price: 800, assimilation: 100 },
    { name: 'Лом Ст3', C: 0.20, Si: 0.25, Mn: 0.50, Cr: 0.00, Ni: 0.0, S: 0.04, P: 0.04, Cu: 0.3, price: 30, assimilation: 100 },
    { name: 'Никель Н1', C: 0.02, Si: 0.03, Mn: 0.01, Cr: 0.00, Ni: 99.5, S: 0.005, P: 0.005, Cu: 0.0, price: 1500, assimilation: 100 }
];

const DEFAULT_ALLOYS = [
    { name: '15Л', C_min: 0.12, C_max: 0.20, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '20Л', C_min: 0.17, C_max: 0.25, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '25Л', C_min: 0.22, C_max: 0.30, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '30Л', C_min: 0.27, C_max: 0.35, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '35Л', C_min: 0.32, C_max: 0.40, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '40Л', C_min: 0.37, C_max: 0.45, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '45Л', C_min: 0.42, C_max: 0.50, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '50Л', C_min: 0.47, C_max: 0.55, Si_min: 0.20, Si_max: 0.52, Mn_min: 0.45, Mn_max: 0.90, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '20ГЛ', C_min: 0.15, C_max: 0.25, Si_min: 0.20, Si_max: 0.40, Mn_min: 1.20, Mn_max: 1.60, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '35ГЛ', C_min: 0.30, C_max: 0.40, Si_min: 0.20, Si_max: 0.40, Mn_min: 1.20, Mn_max: 1.60, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '20ГСЛ', C_min: 0.16, C_max: 0.22, Si_min: 0.60, Si_max: 0.80, Mn_min: 1.00, Mn_max: 1.30, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '30ГСЛ', C_min: 0.25, C_max: 0.35, Si_min: 0.60, Si_max: 0.80, Mn_min: 1.10, Mn_max: 1.40, Cr_min: 0.0, Cr_max: 0.30, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '40ХЛ', C_min: 0.35, C_max: 0.45, Si_min: 0.20, Si_max: 0.40, Mn_min: 0.40, Mn_max: 0.90, Cr_min: 0.80, Cr_max: 1.10, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '35ХМЛ', C_min: 0.30, C_max: 0.40, Si_min: 0.20, Si_max: 0.40, Mn_min: 0.40, Mn_max: 0.90, Cr_min: 0.80, Cr_max: 1.10, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '35ХГСЛ', C_min: 0.30, C_max: 0.40, Si_min: 0.60, Si_max: 0.80, Mn_min: 1.00, Mn_max: 1.30, Cr_min: 0.60, Cr_max: 0.90, Ni_min: 0.0, Ni_max: 0.30, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '30ХНМЛ', C_min: 0.25, C_max: 0.35, Si_min: 0.20, Si_max: 0.40, Mn_min: 0.40, Mn_max: 0.90, Cr_min: 1.30, Cr_max: 1.60, Ni_min: 1.30, Ni_max: 1.60, S_max: 0.04, P_max: 0.04, Cu_max: 0.30 },
    { name: '20Х13Л', C_min: 0.16, C_max: 0.25, Si_min: 0.20, Si_max: 0.80, Mn_min: 0.30, Mn_max: 0.80, Cr_min: 12.0, Cr_max: 14.0, Ni_min: 0.0, Ni_max: 0.60, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '10Х12НДЛ', C_min: 0.00, C_max: 0.10, Si_min: 0.17, Si_max: 0.40, Mn_min: 0.20, Mn_max: 0.60, Cr_min: 12.0, Cr_max: 13.0, Ni_min: 1.00, Ni_max: 1.50, S_max: 0.025, P_max: 0.03, Cu_max: 0.30 },
    { name: '15Х13Л', C_min: 0.00, C_max: 0.15, Si_min: 0.20, Si_max: 0.80, Mn_min: 0.30, Mn_max: 0.80, Cr_min: 12.0, Cr_max: 14.0, Ni_min: 0.0, Ni_max: 0.60, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '15Х25ТЛ', C_min: 0.10, C_max: 0.20, Si_min: 0.50, Si_max: 1.20, Mn_min: 0.50, Mn_max: 1.80, Cr_min: 23.0, Cr_max: 27.0, Ni_min: 0.0, Ni_max: 0.60, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '12Х25Н5ТМФЛ', C_min: 0.00, C_max: 0.12, Si_min: 0.20, Si_max: 1.00, Mn_min: 0.30, Mn_max: 0.80, Cr_min: 23.5, Cr_max: 26.0, Ni_min: 5.00, Ni_max: 6.50, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '16Х18Н12С4ТЮЛ', C_min: 0.13, C_max: 0.19, Si_min: 3.80, Si_max: 4.50, Mn_min: 0.50, Mn_max: 1.00, Cr_min: 17.0, Cr_max: 19.0, Ni_min: 11.0, Ni_max: 13.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '10Х18Н9Л', C_min: 0.00, C_max: 0.14, Si_min: 0.20, Si_max: 1.00, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 17.0, Cr_max: 20.0, Ni_min: 8.00, Ni_max: 11.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '12Х18Н9ТЛ', C_min: 0.00, C_max: 0.12, Si_min: 0.20, Si_max: 1.00, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 17.0, Cr_max: 20.0, Ni_min: 8.00, Ni_max: 11.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '10Х18Н11БЛ', C_min: 0.00, C_max: 0.10, Si_min: 0.20, Si_max: 1.00, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 17.0, Cr_max: 20.0, Ni_min: 8.00, Ni_max: 12.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '07Х17Н16ТЛ', C_min: 0.04, C_max: 0.10, Si_min: 0.20, Si_max: 0.60, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 16.0, Cr_max: 18.0, Ni_min: 15.0, Ni_max: 17.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '12Х18Н12М3ТЛ', C_min: 0.00, C_max: 0.12, Si_min: 0.20, Si_max: 1.00, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 16.0, Cr_max: 19.0, Ni_min: 11.0, Ni_max: 13.0, S_max: 0.03, P_max: 0.035, Cu_max: 0.30 },
    { name: '20Х5МЛ', C_min: 0.15, C_max: 0.25, Si_min: 0.35, Si_max: 0.70, Mn_min: 0.40, Mn_max: 0.60, Cr_min: 4.0, Cr_max: 6.5, Ni_min: 0.0, Ni_max: 0.50, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '40Х9С2Л', C_min: 0.35, C_max: 0.50, Si_min: 2.00, Si_max: 3.00, Mn_min: 0.30, Mn_max: 0.70, Cr_min: 8.0, Cr_max: 10.0, Ni_min: 0.0, Ni_max: 0.60, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '35Х23Н7СЛ', C_min: 0.00, C_max: 0.35, Si_min: 0.50, Si_max: 1.20, Mn_min: 0.50, Mn_max: 0.85, Cr_min: 21.0, Cr_max: 25.0, Ni_min: 6.00, Ni_max: 8.00, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '40Х24Н12СЛ', C_min: 0.00, C_max: 0.40, Si_min: 0.50, Si_max: 1.50, Mn_min: 0.30, Mn_max: 0.80, Cr_min: 22.0, Cr_max: 26.0, Ni_min: 11.0, Ni_max: 13.0, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '20Х20Н14С2Л', C_min: 0.00, C_max: 0.20, Si_min: 2.00, Si_max: 3.00, Mn_min: 0.00, Mn_max: 1.50, Cr_min: 19.0, Cr_max: 22.0, Ni_min: 12.0, Ni_max: 15.0, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '55Х18Г14С2ТЛ', C_min: 0.45, C_max: 0.65, Si_min: 1.50, Si_max: 2.50, Mn_min: 12.0, Mn_max: 16.0, Cr_min: 16.0, Cr_max: 19.0, Ni_min: 0.0, Ni_max: 0.60, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '15Х23Н18Л', C_min: 0.10, C_max: 0.20, Si_min: 0.20, Si_max: 1.00, Mn_min: 1.00, Mn_max: 2.00, Cr_min: 22.0, Cr_max: 25.0, Ni_min: 17.0, Ni_max: 20.0, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '20Х25Н19С2Л', C_min: 0.00, C_max: 0.20, Si_min: 2.00, Si_max: 3.00, Mn_min: 0.50, Mn_max: 1.50, Cr_min: 23.0, Cr_max: 27.0, Ni_min: 18.0, Ni_max: 20.0, S_max: 0.03, P_max: 0.03, Cu_max: 0.30 },
    { name: '110Г13Л', C_min: 0.90, C_max: 1.50, Si_min: 0.30, Si_max: 1.00, Mn_min: 11.5, Mn_max: 15.0, Cr_min: 0.0, Cr_max: 1.00, Ni_min: 0.0, Ni_max: 1.00, S_max: 0.05, P_max: 0.12, Cu_max: 0.30 }
];

db.initDB();

console.log("Seeding Database...");

try {
    for (const mat of DEFAULT_MATERIALS) {
        db.saveMaterial(mat);
    }
    console.log(`Seeded ${DEFAULT_MATERIALS.length} materials.`);

    for (const alloy of DEFAULT_ALLOYS) {
        db.saveAlloy(alloy);
    }
    console.log(`Seeded ${DEFAULT_ALLOYS.length} alloys.`);

    console.log("Database seeded successfully.");
    process.exit(0);
} catch (e) {
    console.error("Failed to seed database: ", e);
    process.exit(1);
}
