import { createClient } from '@supabase/supabase-js'

const VERSION = "6.0 (FINAL STABLE)";
const TIMESTAMP = new Date().toISOString();

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();


// IPC Proxy fetch to bypass CORS and Protocol Errors
const diagnosticFetch = async (url, options = {}) => {
    // 1. Prepare headers for IPC serialization
    const safeHeaders = {};
    if (options.headers) {
        if (options.headers instanceof Headers) {
            options.headers.forEach((v, k) => safeHeaders[k] = v);
        } else {
            Object.assign(safeHeaders, options.headers);
        }
    }

    // Ensure the main process has the API key
    if (!safeHeaders['apikey']) safeHeaders['apikey'] = supabaseAnonKey;

    // SELF-HEALING: If the token is massive (> 8KB), it's corrupted and blocking all traffic.
    const authHeader = safeHeaders['authorization'] || safeHeaders['Authorization'];
    if (authHeader && authHeader.length > 8192) {
        console.error('[Supabase CRITICAL] Session is poisoned (260KB+). Auto-purging to recover...');
        localStorage.clear();
        window.location.reload();
        return new Response(null, { status: 400 });
    }

    // 2. Route through Main Process Proxy if available
    if (window.electron?.ipcRenderer) {
        try {
            const result = await window.electron.ipcRenderer.invoke('supabase-proxy', {
                url,
                options: {
                    method: options.method || 'GET',
                    headers: safeHeaders,
                    body: options.body
                }
            });

            if (result.error) throw new Error(result.error);

            // 3. FINAL STABILITY FIX: Handling "204 No Content" correctly
            // A status 204 (often returned by UPDATE/DELETE) MUST NOT have a body.
            const hasNoContent = result.status === 204 || result.status === 205;
            const responseBody = hasNoContent ? null : result.body;

            return new Response(responseBody, {
                status: result.status,
                statusText: result.statusText,
                headers: result.headers
            });
        } catch (proxyError) {
            console.error('[Supabase Proxy Failure]', proxyError);
        }
    }

    return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        fetch: diagnosticFetch,
        headers: {
            'apikey': supabaseAnonKey
        }
    }
})
