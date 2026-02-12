const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const DBManager = require('./db.cjs');

// HARD FIX: Disable HTTP/2 to prevent ERR_HTTP2_PROTOCOL_ERROR and connection resets
app.commandLine.appendSwitch('disable-http2');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// MULTI-INSTANCE SUPPORT: Allow running multiple accounts via --profile flag
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

        // 1. STYLED HEADER FILTERING: Only essentials
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
                    // CRITICAL: Clean value and ensure it's a string
                    let value = String(options.headers[key]).replace(/[\n\r]/g, '').trim();
                    safeHeaders[lowerKey] = value;
                }
            });
        }

        // 2. Prepare Body - Ensure it's a proper string if it's an object
        let requestBody = null;
        if (isMutation && options.body) {
            requestBody = typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body);
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: safeHeaders,
            // Bypass any session-level cookies/cache that might bloat headers
            partition: 'supabase-session',
            ...(requestBody ? { body: requestBody } : {})
        };

        // 3. LOGGING FOR DEBUGGING "Header Too Large"
        let totalSize = 0;
        Object.entries(safeHeaders).forEach(([k, v]) => totalSize += (k.length + v.length));

        if (isDev) {
            console.log(`[IPC Proxy 7.0] ${fetchOptions.method} ${url.slice(0, 50)}...`, {
                headerSize: totalSize,
                authLength: safeHeaders['authorization']?.length || 0,
                hasBody: !!requestBody
            });
        }

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

// Configure Auto Updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

function setupAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 60 * 60 * 1000);

    autoUpdater.on('update-available', () => console.log('Update available.'));
    autoUpdater.on('update-downloaded', () => console.log('Update downloaded.'));
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
        createWindow();
        if (app.isPackaged) setupAutoUpdater();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
    if (process.platform !== 'darwin') app.quit();
});
