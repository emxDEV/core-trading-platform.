const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const DBManager = require('./db.cjs');

let db = null;

// Configure Auto Updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

function setupAutoUpdater() {
    // Check for updates immediately
    autoUpdater.checkForUpdatesAndNotify();

    // Check again every 1 hour
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);

    autoUpdater.on('update-available', () => {
        console.log('Update available.');
    });

    autoUpdater.on('update-downloaded', () => {
        console.log('Update downloaded. Creating notification/prompt...');
        // Optionally send a message to the renderer process to show a custom UI
        // win.webContents.send('update_downloaded');
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        titleBarStyle: 'hiddenInset', // Mac: traffic lights inset, frameless
        frame: process.platform !== 'darwin' ? false : true, // Windows/Linux: frameless for custom titlebar
        webPreferences: {
            preload: path.resolve(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
    });

    // Use 'wait-on' ensures localhost is ready in development
    // In production, load the built index.html
    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // Open the DevTools by default in dev
        win.webContents.openDevTools();
        console.log('Running in development mode');
    } else {
        // In production, load the index.html from the dist folder
        // Note: Assuming 'electron' folder is at root, and 'dist' is also at root
        win.loadFile(path.join(__dirname, '../dist/index.html'));
        console.log('Running in production mode');
    }
}

app.whenReady().then(() => {
    // Initialize Database
    db = new DBManager();
    createWindow();

    // Setup Auto Updater (only in production)
    if (app.isPackaged) {
        setupAutoUpdater();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
