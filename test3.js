import electron from 'electron';
console.log("ESM NATIVE NATIVE ELECTRON KEYS:", Object.keys(electron));
console.log("PROCESS.VERSIONS:", process.versions);
electron.app.quit();
