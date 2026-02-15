const { app, BrowserWindow, ipcMain, shell, net, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const DBManager = require('./db.cjs');

// HARD FIX: Disable HTTP/2
app.commandLine.appendSwitch('disable-http2');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// MULTI-INSTANCE SUPPORT
const profileArg = process.argv.find(arg => arg.startsWith('--profile='));
const profileName = profileArg ? profileArg.split('=')[1] : null;

if (profileName) {
    console.log(`[Multi-Instance] Initializing with profile: ${profileName}`);
    const currentName = app.name || 'CORE';
    const newPath = path.join(app.getPath('appData'), `${currentName}_Profile_${profileName}`);
    app.setPath('userData', newPath);
}

let db = null;

// Open URLs in system browser
ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});

// GOD FIX: Proxy Supabase requests through Main Process
ipcMain.handle('supabase-proxy', async (event, { url, options }) => {
    try {
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase());
        const safeHeaders = {
            'User-Agent': 'CORE-App/1.0',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br'
        };

        const allowedHeaders = [
            'apikey', 'authorization', 'content-type', 'prefer',
            'range', 'if-none-match', 'x-client-info'
        ];

        if (options.headers) {
            Object.keys(options.headers).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (allowedHeaders.includes(lowerKey)) {
                    let value = String(options.headers[key]).replace(/[\n\r]/g, '').trim();
                    safeHeaders[lowerKey] = value;
                }
            });
        }

        let requestBody = null;
        if (isMutation && options.body) {
            requestBody = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: safeHeaders,
            partition: 'supabase-session',
            ...(requestBody ? { body: requestBody } : {})
        };

        const response = await net.fetch(url, fetchOptions);
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: await response.text()
        };

        return result;
    } catch (error) {
        console.error('[IPC Proxy Error]', error);
        return { error: error.message };
    }
});

// Manual Update Trigger
ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { success: false, message: 'Not available in development mode' };
    try {
        const result = await autoUpdater.checkForUpdatesAndNotify();
        return { success: true, updateInfo: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Force Restart and Install
ipcMain.handle('restart-and-install', () => {
    autoUpdater.quitAndInstall(false, true);
});

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

function setupAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    if (process.platform === 'darwin') autoUpdater.forceDevUpdateConfig = false;

    autoUpdater.on('checking-for-update', () => {
        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', { type: 'checking' }));
    });
    autoUpdater.on('update-available', (info) => {
        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', { type: 'available', info }));
    });
    autoUpdater.on('update-not-available', () => {
        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', { type: 'not-available' }));
    });
    autoUpdater.on('download-progress', (progress) => {
        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', { type: 'progress', progress }));
    });
    autoUpdater.on('update-downloaded', (info) => {
        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', { type: 'downloaded', info }));
    });
    autoUpdater.on('error', (err) => {
        console.error('Updater Error:', err);
        let friendlyMessage = err.message;

        if (process.platform === 'darwin' && err.message.includes('Code signature')) {
            friendlyMessage = "Security Block: This update cannot be applied automatically because the app is not digitally signed. Please download the latest version manually from GitHub.";
        } else if (err.message.includes('net::ERR_INTERNET_DISCONNECTED')) {
            friendlyMessage = "Update check failed: No tactical connection detected.";
        }

        BrowserWindow.getAllWindows().forEach(win => win.webContents.send('updater-event', {
            type: 'error',
            message: friendlyMessage,
            error: err
        }));
    });
    autoUpdater.checkForUpdatesAndNotify();
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400, height: 900,
        minWidth: 1000, minHeight: 700,
        titleBarStyle: 'hiddenInset',
        frame: process.platform !== 'darwin' ? false : true,
        webPreferences: {
            preload: path.resolve(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

const gotTheLock = profileName ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    if (!profileName) {
        app.on('second-instance', (event, commandLine) => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                if (win.isMinimized()) win.restore();
                win.focus();
                const deeplinkingUrl = commandLine.find((arg) => arg.startsWith('core-app://'));
                if (deeplinkingUrl) {
                    win.webContents.send('deep-link', deeplinkingUrl);
                }
            }
        });
    }

    app.whenReady().then(() => {
        db = new DBManager();

        ipcMain.handle('save-image', async (event, { dataUrl, filename }) => {
            try {
                const { filePath } = await dialog.showSaveDialog({
                    title: 'Save Legacy Image',
                    defaultPath: filename || 'legacy-capture.png',
                    filters: [{ name: 'Images', extensions: ['png'] }]
                });
                if (filePath) {
                    let base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));
                    return { success: true, filePath };
                }
                return { success: false, canceled: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });


        createWindow();
        if (app.isPackaged) setupAutoUpdater();

        // [PERMISSION FIX] Explicitly request Mic access on Mac
        if (process.platform === 'darwin') {
            try {
                const { systemPreferences } = require('electron');
                systemPreferences.askForMediaAccess('microphone').then(access => {
                    console.log(`[Permission] Microphone access ${access ? 'granted' : 'denied'}`);
                });
            } catch (e) {
                console.error('[Permission] Failed to prompt for media access:', e);
            }
        }

        ipcMain.handle('request-mic-permission', async () => {
            if (process.platform === 'darwin') {
                const { systemPreferences } = require('electron');
                return await systemPreferences.askForMediaAccess('microphone');
            }
            return true; // Assume true for others (or handled by browser)
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send('deep-link', url);
    }
});

if (process.defaultApp) {
    if (process.argv.length >= 2) app.setAsDefaultProtocolClient('core-app', process.execPath, [path.resolve(process.argv[1])]);
} else {
    app.setAsDefaultProtocolClient('core-app');
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
