const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getAlloys: () => ipcRenderer.invoke('get-alloys'),
    getMaterials: () => ipcRenderer.invoke('get-materials'),
    getNomenclature: () => ipcRenderer.invoke('get-nom'),
    getMelts: () => ipcRenderer.invoke('get-melts'),
    saveMelt: (melt) => ipcRenderer.invoke('save-melt', melt),
    deleteMelt: (id) => ipcRenderer.invoke('delete-melt', id),
    saveNomenclature: (item) => ipcRenderer.invoke('save-nom', item),
    deleteNomenclature: (id) => ipcRenderer.invoke('delete-nom', id),
    saveMaterial: (item) => ipcRenderer.invoke('save-mat', item),
    deleteMaterial: (id) => ipcRenderer.invoke('delete-mat', id),
    saveAlloy: (item) => ipcRenderer.invoke('save-alloy', item),
    deleteAlloy: (id) => ipcRenderer.invoke('delete-alloy', id),
    saveExcelFile: (buffer, defaultFilename) => ipcRenderer.invoke('save-excel-file', { buffer, defaultFilename }),
});
