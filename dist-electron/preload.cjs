"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    getAlloys: () => electron_1.ipcRenderer.invoke('get-alloys'),
    getMaterials: () => electron_1.ipcRenderer.invoke('get-materials'),
    getNomenclature: () => electron_1.ipcRenderer.invoke('get-nom'),
    getMelts: () => electron_1.ipcRenderer.invoke('get-melts'),
    saveMelt: (melt) => electron_1.ipcRenderer.invoke('save-melt', melt),
    deleteMelt: (id) => electron_1.ipcRenderer.invoke('delete-melt', id),
});
