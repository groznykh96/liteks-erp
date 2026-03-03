"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_db_1 = __importDefault(require("./electron-db.cjs"));
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        title: 'ЛИТЭКС информационные технологии — Расчёт шихты (V2)',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    electron_db_1.default.initDB();
    electron_1.ipcMain.handle('get-alloys', () => electron_db_1.default.getAlloys());
    electron_1.ipcMain.handle('get-materials', () => electron_db_1.default.getMaterials());
    electron_1.ipcMain.handle('get-nom', () => electron_db_1.default.getNomenclature());
    electron_1.ipcMain.handle('get-melts', () => {
        const melts = electron_db_1.default.getMelts();
        // Parse JSON arrays back
        return melts.map(m => ({ ...m, castings: JSON.parse(m.castings_json) }));
    });
    electron_1.ipcMain.handle('save-melt', (e, melt) => electron_db_1.default.saveMelt(melt));
    electron_1.ipcMain.handle('delete-melt', (e, id) => electron_db_1.default.deleteMelt(id));
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    electron_1.app.quit();
});
