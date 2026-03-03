"use strict";
const electron = require("electron");
const { app, BrowserWindow, ipcMain } = electron;
const path = require("path");
const db = require("./electron-db.js");
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ЛИТЭКС информационные технологии — Расчёт шихты (V2)",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }
}
app.whenReady().then(() => {
  db.initDB();
  ipcMain.handle("get-alloys", () => db.getAlloys());
  ipcMain.handle("get-materials", () => db.getMaterials());
  ipcMain.handle("get-nom", () => db.getNomenclature());
  ipcMain.handle("get-melts", () => {
    const melts = db.getMelts();
    return melts.map((m) => ({ ...m, castings: JSON.parse(m.castings_json) }));
  });
  ipcMain.handle("save-melt", (e, melt) => db.saveMelt(melt));
  ipcMain.handle("delete-melt", (e, id) => db.deleteMelt(id));
  ipcMain.handle("save-nom", (e, item) => db.saveNomenclature(item));
  ipcMain.handle("delete-nom", (e, id) => db.deleteNomenclature(id));
  ipcMain.handle("save-mat", (e, item) => db.saveMaterial(item));
  ipcMain.handle("delete-mat", (e, id) => db.deleteMaterial(id));
  ipcMain.handle("save-alloy", (e, item) => db.saveAlloy(item));
  ipcMain.handle("delete-alloy", (e, id) => db.deleteAlloy(id));
  createWindow();
});
app.on("window-all-closed", () => {
  app.quit();
});
