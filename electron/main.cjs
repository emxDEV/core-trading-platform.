const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const DBManager = require('./db.cjs');

let db = null;

// Open URLs in system browser
ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});

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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        // Someone tried to run a second instance, we should focus our window.
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();

            // Handle Deep Link on Windows
            const deeplinkingUrl = commandLine.find((arg) => arg.startsWith('core-app://'));
            if (deeplinkingUrl) {
                win.webContents.send('deep-link', deeplinkingUrl);
            }
        }
    });

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
}

// Handle Deep Link on macOS
app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('Main process received deep link (macOS):', url);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send('deep-link', url);
    }
});

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('core-app', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('core-app');
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
