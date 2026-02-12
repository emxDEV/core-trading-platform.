const Database = require('better-sqlite3');
const path = require('path');
const { app, ipcMain } = require('electron');
const fs = require('fs');

class DBManager {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        // Store database in user data directory to persist between updates and installs
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'trades.db');

        if (!app.isPackaged) console.log('Database path:', dbPath);

        this.db = new Database(dbPath);
        this.createTables();
        this.registerHandlers();
    }

    createTables() {
        try {
            // 1. Initial table creation
            const createAccountsTable = `
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT CHECK(type IN ('Live', 'Evaluation', 'Funded', 'Demo', 'Backtesting')) NOT NULL DEFAULT 'Live',
                    balance REAL DEFAULT 0,
                    currency TEXT DEFAULT 'USD',
                    capital REAL DEFAULT 0,
                    profit_target REAL DEFAULT 0,
                    max_loss REAL DEFAULT 0,
                    consistency_rule TEXT DEFAULT '',
                    prop_firm TEXT DEFAULT '',
                    reset_date TEXT,
                    breach_report TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
            this.db.exec(createAccountsTable);

            // 2. Column Migrations (Incremental)
            const acctInfo = this.db.prepare("PRAGMA table_info(accounts)").all();
            const acctCols = acctInfo.map(c => c.name);
            if (!app.isPackaged) console.log('[DB] Accounts columns:', acctCols);

            const migrations = [
                { col: 'capital', sql: 'ALTER TABLE accounts ADD COLUMN capital REAL DEFAULT 0' },
                { col: 'profit_target', sql: 'ALTER TABLE accounts ADD COLUMN profit_target REAL DEFAULT 0' },
                { col: 'max_loss', sql: 'ALTER TABLE accounts ADD COLUMN max_loss REAL DEFAULT 0' },
                { col: 'consistency_rule', sql: 'ALTER TABLE accounts ADD COLUMN consistency_rule TEXT DEFAULT \'\'' },
                { col: 'prop_firm', sql: 'ALTER TABLE accounts ADD COLUMN prop_firm TEXT DEFAULT \'\'' },
                { col: 'reset_date', sql: 'ALTER TABLE accounts ADD COLUMN reset_date TEXT' },
                { col: 'breach_report', sql: 'ALTER TABLE accounts ADD COLUMN breach_report TEXT' },
                { col: 'is_ranked_up', sql: 'ALTER TABLE accounts ADD COLUMN is_ranked_up INTEGER DEFAULT 0' },
                { col: 'is_ranked_up', sql: 'ALTER TABLE accounts ADD COLUMN is_ranked_up INTEGER DEFAULT 0' },
                { col: 'prev_reset_date', sql: 'ALTER TABLE accounts ADD COLUMN prev_reset_date TEXT' },
                { col: 'payout_goal', sql: 'ALTER TABLE accounts ADD COLUMN payout_goal REAL DEFAULT 0' },
                { col: 'user_id', sql: 'ALTER TABLE accounts ADD COLUMN user_id TEXT' },
                { col: 'user_id', sql: 'ALTER TABLE pill_colors ADD COLUMN user_id TEXT' } // Just in case, try adding to pill_colors if possible
            ];

            for (const m of migrations) {
                if (!acctCols.includes(m.col)) {
                    console.log(`[DB] Migrating: ${m.col}`);
                    try {
                        this.db.exec(m.sql);
                    } catch (e) {
                        console.error(`[DB] Migration failed for ${m.col}:`, e.message);
                    }
                }
            }

            // 3. CHECK Constraint rebuild (for 'Funded')
            const createSql = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'").get();
            if (createSql && createSql.sql && !createSql.sql.includes('Funded')) {
                console.log('[DB] Running legacy Funded type migration...');
                this.db.pragma('foreign_keys = OFF');
                try {
                    this.db.exec(`
                        DROP TABLE IF EXISTS accounts_new;
                        CREATE TABLE accounts_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            type TEXT CHECK(type IN ('Live', 'Evaluation', 'Funded', 'Demo', 'Backtesting')) NOT NULL DEFAULT 'Live',
                            balance REAL DEFAULT 0,
                            currency TEXT DEFAULT 'USD',
                            capital REAL DEFAULT 0,
                            profit_target REAL DEFAULT 0,
                            max_loss REAL DEFAULT 0,
                            consistency_rule TEXT DEFAULT '',
                            prop_firm TEXT DEFAULT '',
                            reset_date TEXT,
                            breach_report TEXT,
                            is_ranked_up INTEGER DEFAULT 0,
                            prev_reset_date TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                        INSERT INTO accounts_new SELECT id, name, type, balance, currency, capital, profit_target, max_loss, consistency_rule, prop_firm, reset_date, breach_report, is_ranked_up, NULL, created_at FROM accounts;
                        DROP TABLE accounts;
                        ALTER TABLE accounts_new RENAME TO accounts;
                    `);
                } catch (e) {
                    console.error('[DB] Funded migration failed:', e.message);
                }
            }

            // 4. Trades Table
            this.db.pragma('foreign_keys = OFF');
            const tableInfo = this.db.prepare("PRAGMA table_info(trades)").all();
            const tradesSqlRecord = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='trades'").get();

            const hasNewColumns = tableInfo.some(col => col.name === 'model') &&
                tableInfo.some(col => col.name === 'trade_session');
            const hasCascade = tradesSqlRecord && tradesSqlRecord.sql && tradesSqlRecord.sql.includes('ON DELETE CASCADE');

            if ((!hasNewColumns || !hasCascade) && tableInfo.length > 0) {
                console.log('[DB] Force-migrating trades table structure (Cascades or columns missing)...');
                this.db.exec(`DROP TABLE IF EXISTS trades`);
            }

            const createTradesTable = `
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER,
                    date TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    model TEXT,
                    bias TEXT,
                    side TEXT CHECK(side IN ('LONG', 'SHORT')) NOT NULL,
                    confluences TEXT,
                    entry_signal TEXT,
                    order_type TEXT,
                    sl_pips REAL,
                    risk_percent REAL,
                    pnl REAL NOT NULL,
                    psychology TEXT,
                    mistakes TEXT,
                    comment_bias TEXT,
                    comment_execution TEXT,
                    comment_problems TEXT,
                    comment_fazit TEXT,
                    image_paths TEXT, 
                    images_execution TEXT,
                    images_condition TEXT,
                    images_narrative TEXT,
                    trade_session TEXT,
                    account_type TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
                )
            `;
            this.db.exec(createTradesTable);

            // 5. Pill Colors
            const createPillColorsTable = `
                CREATE TABLE IF NOT EXISTS pill_colors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    value TEXT NOT NULL,
                    color TEXT NOT NULL DEFAULT 'primary',
                    UNIQUE(category, value)
                )
            `;
            this.db.exec(createPillColorsTable);

            // 6. Copy Trading Tables
            const createCopyGroupsTable = `
                CREATE TABLE IF NOT EXISTS copy_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    leader_account_id INTEGER NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (leader_account_id) REFERENCES accounts (id) ON DELETE CASCADE
                )
            `;
            this.db.exec(createCopyGroupsTable);

            // Copy Groups Migration: Add user_id if missing
            const cgInfo = this.db.prepare("PRAGMA table_info(copy_groups)").all();
            if (!cgInfo.some(c => c.name === 'user_id')) {
                console.log('[DB] Migrating copy_groups: adding user_id');
                this.db.exec("ALTER TABLE copy_groups ADD COLUMN user_id TEXT");
            }

            const createCopyMembersTable = `
                CREATE TABLE IF NOT EXISTS copy_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id INTEGER NOT NULL,
                    follower_account_id INTEGER NOT NULL,
                    risk_multiplier REAL DEFAULT 1.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (group_id) REFERENCES copy_groups (id) ON DELETE CASCADE,
                    FOREIGN KEY (follower_account_id) REFERENCES accounts (id) ON DELETE CASCADE,
                    UNIQUE(group_id, follower_account_id)
                )
            `;
            this.db.exec(createCopyMembersTable);

            // 7. Trades Migration for account_type
            const tradesInfo = this.db.prepare("PRAGMA table_info(trades)").all();
            const tradesCols = tradesInfo.map(c => c.name);
            if (!tradesCols.includes('account_type')) {
                console.log('[DB] Migrating trades: adding account_type');
                try {
                    this.db.exec("ALTER TABLE trades ADD COLUMN account_type TEXT");
                } catch (e) {
                    console.error('[DB] Failed to add account_type to trades:', e.message);
                }
            }

            const attachmentMigrations = [
                { col: 'images_execution', sql: 'ALTER TABLE trades ADD COLUMN images_execution TEXT' },
                { col: 'images_condition', sql: 'ALTER TABLE trades ADD COLUMN images_condition TEXT' },
                { col: 'images_narrative', sql: 'ALTER TABLE trades ADD COLUMN images_narrative TEXT' },
            ];

            for (const m of attachmentMigrations) {
                if (!tradesCols.includes(m.col)) {
                    console.log(`[DB] Migrating trades: adding ${m.col}`);
                    try {
                        this.db.exec(m.sql);
                    } catch (e) {
                        console.error(`[DB] Migration failed for ${m.col}:`, e.message);
                    }
                }
            }

            // 8. Daily Journals Table
            const createDailyJournalsTable = `
                CREATE TABLE IF NOT EXISTS daily_journals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    date TEXT NOT NULL,
                    goals TEXT NOT NULL,
                    reflection TEXT,
                    is_completed INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date)
                )
            `;
            this.db.exec(createDailyJournalsTable);

            // Re-enable global foreign keys
            this.db.pragma('foreign_keys = ON');

        } catch (globalError) {
            console.error('[DB] Critical error in createTables:', globalError);
        }
    }

    registerHandlers() {
        ipcMain.handle('db-get-trades', (event, userId) => {
            try {
                const userFilter = userId
                    ? 'a.user_id = ?'
                    : 'a.user_id IS NULL';

                // If account_type is null (legacy data), fallback to current account type
                const stmt = this.db.prepare(`
            SELECT t.*, 
                   COALESCE(t.account_type, a.type) as account_type,
                   a.name as account_name, 
                   a.type as current_account_type, 
                   a.prop_firm as account_prop_firm
            FROM trades t 
            LEFT JOIN accounts a ON t.account_id = a.id 
            WHERE ${userFilter}
            ORDER BY t.date DESC, t.created_at DESC
        `);
                return { success: true, data: userId ? stmt.all(userId) : stmt.all() };
            } catch (error) {
                console.error('DB Error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-add-trade', (event, trade) => {
            try {
                // Fetch the current account type to snapshot it
                let snapshotType = null;
                if (trade.account_id) {
                    const acc = this.db.prepare('SELECT type FROM accounts WHERE id = ?').get(trade.account_id);
                    if (acc) snapshotType = acc.type;
                }

                const stmt = this.db.prepare(`
                    INSERT INTO trades (
                        account_id, date, symbol, model, trade_session, bias, side, confluences, 
                        entry_signal, order_type, sl_pips, risk_percent, pnl, 
                        psychology, mistakes, comment_bias, comment_execution, 
                        comment_problems, comment_fazit, image_paths, 
                        images_execution, images_condition, images_narrative,
                        account_type
                    )
                    VALUES (
                        @account_id, @date, @symbol, @model, @trade_session, @bias, @side, @confluences, 
                        @entry_signal, @order_type, @sl_pips, @risk_percent, @pnl, 
                        @psychology, @mistakes, @comment_bias, @comment_execution, 
                        @comment_problems, @comment_fazit, @image_paths, 
                        @images_execution, @images_condition, @images_narrative,
                        @account_type
                    )
                `);

                const data = {
                    account_id: trade.account_id ?? null,
                    date: trade.date ?? null,
                    symbol: trade.symbol ?? null,
                    model: trade.model ?? null,
                    trade_session: trade.trade_session ?? null,
                    bias: trade.bias ?? null,
                    side: trade.side ?? null,
                    confluences: trade.confluences ?? null,
                    entry_signal: trade.entry_signal ?? null,
                    order_type: trade.order_type ?? null,
                    sl_pips: trade.sl_pips ?? null,
                    risk_percent: trade.risk_percent ?? null,
                    pnl: trade.pnl ?? null,
                    psychology: trade.psychology ?? null,
                    mistakes: trade.mistakes ?? null,
                    comment_bias: trade.comment_bias ?? null,
                    comment_execution: trade.comment_execution ?? null,
                    comment_problems: trade.comment_problems ?? null,
                    comment_fazit: trade.comment_fazit ?? null,
                    image_paths: trade.image_paths ?? null,
                    images_execution: trade.images_execution ?? null,
                    images_condition: trade.images_condition ?? null,
                    images_narrative: trade.images_narrative ?? null,
                    account_type: snapshotType
                };

                console.log('[DB] Inserting Trade:', data);

                const info = stmt.run(data);
                return { success: true, id: info.lastInsertRowid };
            } catch (error) {
                console.error('DB Error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-delete-trade', (event, id) => {
            try {
                const stmt = this.db.prepare('DELETE FROM trades WHERE id = ?');
                stmt.run(id);
                return { success: true };
            } catch (error) {
                console.error('DB Error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-update-trade', (event, trade) => {
            try {
                const stmt = this.db.prepare(`
                    UPDATE trades SET
                        account_id = @account_id,
                        date = @date,
                        symbol = @symbol,
                        model = @model,
                        trade_session = @trade_session,
                        bias = @bias,
                        side = @side,
                        confluences = @confluences,
                        entry_signal = @entry_signal,
                        order_type = @order_type,
                        sl_pips = @sl_pips,
                        risk_percent = @risk_percent,
                        pnl = @pnl,
                        psychology = @psychology,
                        mistakes = @mistakes,
                        comment_bias = @comment_bias,
                        comment_execution = @comment_execution,
                        comment_problems = @comment_problems,
                        comment_fazit = @comment_fazit,
                        image_paths = @image_paths,
                        images_execution = @images_execution,
                        images_condition = @images_condition,
                        images_narrative = @images_narrative
                    WHERE id = @id
                `);
                stmt.run(trade);
                return { success: true };
            } catch (error) {
                console.error('DB Error:', error);
                return { success: false, error: error.message };
            }
        });

        // Account Handlers
        ipcMain.handle('db-get-accounts', (event, userId) => {
            try {
                const sql = userId
                    ? 'SELECT * FROM accounts WHERE user_id = ? ORDER BY name ASC'
                    : 'SELECT * FROM accounts WHERE user_id IS NULL ORDER BY name ASC';
                const stmt = this.db.prepare(sql);
                return { success: true, data: userId ? stmt.all(userId) : stmt.all() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-add-account', (event, account) => {
            try {
                const stmt = this.db.prepare(`
                    INSERT INTO accounts (name, type, currency, capital, profit_target, max_loss, consistency_rule, prop_firm, reset_date, is_ranked_up, prev_reset_date, payout_goal, user_id)
                    VALUES (@name, @type, @currency, @capital, @profit_target, @max_loss, @consistency_rule, @prop_firm, @reset_date, @is_ranked_up, @prev_reset_date, @payout_goal, @user_id)
                `);
                const data = {
                    name: account.name,
                    type: account.type,
                    currency: account.currency || 'USD',
                    capital: account.capital || 0,
                    profit_target: account.profit_target || 0,
                    max_loss: account.max_loss || 0,
                    consistency_rule: account.consistency_rule || '',
                    prop_firm: account.prop_firm || '',
                    reset_date: account.reset_date || null,
                    is_ranked_up: account.is_ranked_up ? 1 : 0,
                    prev_reset_date: account.prev_reset_date || null,
                    payout_goal: account.payout_goal || 0,
                    user_id: account.user_id || null, // Capture user_id
                };
                const info = stmt.run(data);
                return { success: true, id: info.lastInsertRowid };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-update-account', (event, account) => {
            try {
                const stmt = this.db.prepare(`
                    UPDATE accounts SET 
                        name = @name, 
                        type = @type, 
                        capital = @capital,
                        profit_target = @profit_target, 
                        max_loss = @max_loss, 
                        consistency_rule = @consistency_rule, 
                        prop_firm = @prop_firm,
                        reset_date = @reset_date,
                        breach_report = @breach_report,
                        is_ranked_up = @is_ranked_up,
                        prev_reset_date = @prev_reset_date,
                        payout_goal = @payout_goal
                    WHERE id = @id
                `);
                const data = {
                    id: account.id,
                    name: account.name,
                    type: account.type,
                    capital: account.capital || 0,
                    profit_target: account.profit_target || 0,
                    max_loss: account.max_loss || 0,
                    consistency_rule: account.consistency_rule || '',
                    prop_firm: account.prop_firm || '',
                    reset_date: account.reset_date || null,
                    breach_report: account.breach_report || null,
                    is_ranked_up: account.is_ranked_up ? 1 : 0,
                    prev_reset_date: account.prev_reset_date || null,
                    payout_goal: account.payout_goal || 0,
                };
                const info = stmt.run(data);
                return { success: true, id: info.lastInsertRowid };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-delete-account', (event, id) => {
            // Use .pragma() instead of .exec() for better-sqlite3 reliability
            this.db.pragma('foreign_keys = OFF');
            try {
                // Defensive parsing
                let accountId = id;
                if (id && typeof id === 'object' && id.id) accountId = id.id;
                accountId = parseInt(accountId, 10);

                if (isNaN(accountId)) {
                    return { success: false, error: 'Invalid Account ID' };
                }

                // Delete everything related to this account
                // No transaction here to avoid PRAGMA issues
                this.db.prepare('DELETE FROM trades WHERE account_id = ?').run(accountId);
                this.db.prepare('DELETE FROM copy_members WHERE follower_account_id = ? OR group_id IN (SELECT id FROM copy_groups WHERE leader_account_id = ?)').run(accountId, accountId);
                this.db.prepare('DELETE FROM copy_groups WHERE leader_account_id = ?').run(accountId);
                const info = this.db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);

                return { success: true, count: info.changes };
            } catch (error) {
                console.error('[DB] Delete Account Error:', error);
                return { success: false, error: error.message };
            } finally {
                this.db.pragma('foreign_keys = ON');
            }
        });

        ipcMain.handle('db-delete-guest-data', () => {
            try {
                this.db.pragma('foreign_keys = OFF');
                // Get IDs of guest accounts
                const guestAccountIds = this.db.prepare('SELECT id FROM accounts WHERE user_id IS NULL').all().map(a => a.id);

                // Delete trades associated with guest accounts
                if (guestAccountIds.length > 0) {
                    const placeholders = guestAccountIds.map(() => '?').join(',');
                    this.db.prepare(`DELETE FROM trades WHERE account_id IN (${placeholders})`).run(...guestAccountIds);
                }

                // Delete copy members associated with guest accounts (either as follower or leader)
                this.db.prepare('DELETE FROM copy_members WHERE follower_account_id IN (SELECT id FROM accounts WHERE user_id IS NULL) OR group_id IN (SELECT id FROM copy_groups WHERE user_id IS NULL)').run();

                // Delete guest copy groups
                this.db.prepare('DELETE FROM copy_groups WHERE user_id IS NULL').run();

                // Delete guest accounts
                this.db.prepare('DELETE FROM accounts WHERE user_id IS NULL').run();

                this.db.pragma('foreign_keys = ON');
                return { success: true };
            } catch (error) {
                console.error('[DB] Delete Guest Data Error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-delete-user-data', (event, userId) => {
            if (!userId) {
                return { success: false, error: 'No User ID provided' };
            }
            try {
                this.db.pragma('foreign_keys = OFF');

                // Get IDs of accounts belonging to the user
                const userAccountIds = this.db.prepare('SELECT id FROM accounts WHERE user_id = ?').all(userId).map(a => a.id);

                // Delete trades associated with user accounts
                if (userAccountIds.length > 0) {
                    const placeholders = userAccountIds.map(() => '?').join(',');
                    this.db.prepare(`DELETE FROM trades WHERE account_id IN (${placeholders})`).run(...userAccountIds);
                }

                // Delete copy members associated with user accounts or groups
                this.db.prepare('DELETE FROM copy_members WHERE follower_account_id IN (SELECT id FROM accounts WHERE user_id = ?) OR group_id IN (SELECT id FROM copy_groups WHERE user_id = ?)').run(userId, userId);

                // Delete copy groups belonging to the user
                this.db.prepare('DELETE FROM copy_groups WHERE user_id = ?').run(userId);

                // Delete accounts belonging to the user
                this.db.prepare('DELETE FROM accounts WHERE user_id = ?').run(userId);

                this.db.pragma('foreign_keys = ON');
                return { success: true };
            } catch (error) {
                console.error('[DB] Delete User Data Error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-claim-local-data', (event, userId) => {
            if (!userId) {
                return { success: false, error: 'No User ID provided' };
            }
            try {
                const claimAccounts = this.db.prepare('UPDATE accounts SET user_id = ? WHERE user_id IS NULL');
                // Check if copy_groups has user_id column before updating (added in migration)
                // Just try updating copy_groups, if fails (no column) catch error
                let changes = 0;

                try {
                    const info1 = claimAccounts.run(userId);
                    changes += info1.changes;
                } catch (e) {
                    console.error('[DB] Accounts claim failed:', e);
                }

                try {
                    const claimGroups = this.db.prepare('UPDATE copy_groups SET user_id = ? WHERE user_id IS NULL');
                    const info2 = claimGroups.run(userId);
                    changes += info2.changes;
                } catch (e) {
                    // Usually if column missing, but migration should have run
                    console.error('[DB] Copy groups claim failed:', e);
                }

                return { success: true, changes };
            } catch (error) {
                console.error('[DB] Claim Data Error:', error);
                return { success: false, error: error.message };
            }
        });

        // Pill Color Handlers
        ipcMain.handle('db-get-pill-colors', () => {
            try {
                const stmt = this.db.prepare('SELECT * FROM pill_colors ORDER BY category, value');
                return { success: true, data: stmt.all() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-set-pill-color', (event, { category, value, color }) => {
            try {
                const stmt = this.db.prepare(`
                    INSERT INTO pill_colors (category, value, color) VALUES (@category, @value, @color)
                    ON CONFLICT(category, value) DO UPDATE SET color = @color
                `);
                stmt.run({ category, value, color });
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Copy Trading Handlers
        ipcMain.handle('db-get-copy-groups', (event, userId) => {
            try {
                const userFilter = userId ? 'leader.user_id = ?' : 'leader.user_id IS NULL';

                // Join groups with leader account to check user_id
                // Assuming groups also store user_id, or we rely on leader account's user_id.
                // We added user_id to copy_groups, so we can use that.

                const groupUserFilter = userId ? 'g.user_id = ?' : 'g.user_id IS NULL';

                const stmt = this.db.prepare(`
                    SELECT g.*, a.name as leader_name 
                    FROM copy_groups g 
                    JOIN accounts a ON g.leader_account_id = a.id
                    WHERE ${groupUserFilter}
                `);
                const groups = userId ? stmt.all(userId) : stmt.all();

                // For each group, get members
                const memberStmt = this.db.prepare(`
                    SELECT m.*, a.name as follower_name, a.type as follower_type 
                    FROM copy_members m
                    JOIN accounts a ON m.follower_account_id = a.id
                    WHERE m.group_id = ?
                `);

                const data = groups.map(g => ({
                    ...g,
                    members: memberStmt.all(g.id)
                }));

                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-add-copy-group', (event, { name, leader_id, user_id }) => {
            try {
                const stmt = this.db.prepare('INSERT INTO copy_groups (name, leader_account_id, user_id) VALUES (?, ?, ?)');
                const info = stmt.run(name, leader_id, user_id || null);
                return { success: true, id: info.lastInsertRowid };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-delete-copy-group', (event, id) => {
            try {
                this.db.prepare('DELETE FROM copy_groups WHERE id = ?').run(id);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-add-copy-member', (event, { group_id, follower_id, risk_multiplier }) => {
            try {
                const stmt = this.db.prepare('INSERT INTO copy_members (group_id, follower_account_id, risk_multiplier) VALUES (?, ?, ?)');
                const info = stmt.run(group_id, follower_id, risk_multiplier || 1.0);
                return { success: true, id: info.lastInsertRowid };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-remove-copy-member', (event, id) => {
            try {
                this.db.prepare('DELETE FROM copy_members WHERE id = ?').run(id);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-update-copy-group-status', (event, { id, is_active }) => {
            try {
                this.db.prepare('UPDATE copy_groups SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-update-copy-group', (event, { id, updates }) => {
            try {
                const allowedFields = ['name', 'leader_account_id', 'is_active'];
                const setClause = [];
                const values = [];

                for (const [key, value] of Object.entries(updates)) {
                    if (allowedFields.includes(key)) {
                        setClause.push(`${key} = ?`);
                        values.push(value);
                    }
                }

                if (setClause.length === 0) {
                    return { success: false, error: 'No valid fields to update' };
                }

                values.push(id);
                const sql = `UPDATE copy_groups SET ${setClause.join(', ')} WHERE id = ?`;
                this.db.prepare(sql).run(...values);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-clear-all', () => {
            try {
                this.db.pragma('foreign_keys = OFF');
                this.db.prepare('DELETE FROM trades').run();
                this.db.prepare('DELETE FROM accounts').run();
                this.db.prepare('DELETE FROM copy_groups').run();
                this.db.prepare('DELETE FROM copy_members').run();
                this.db.prepare('DELETE FROM pill_colors').run();
                this.db.pragma('foreign_keys = ON');
                return { success: true };
            } catch (error) {
                console.error('DB Clear Error:', error);
                return { success: false, error: error.message };
            }
        });

        // Daily Journal Handlers
        ipcMain.handle('db-get-daily-journals', (event, userId) => {
            try {
                const sql = userId
                    ? 'SELECT * FROM daily_journals WHERE user_id = ? ORDER BY date DESC'
                    : 'SELECT * FROM daily_journals WHERE user_id IS NULL ORDER BY date DESC';
                const stmt = this.db.prepare(sql);
                return { success: true, data: userId ? stmt.all(userId) : stmt.all() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-get-journal-by-date', (event, { userId, date }) => {
            try {
                const sql = userId
                    ? 'SELECT * FROM daily_journals WHERE user_id = ? AND date = ?'
                    : 'SELECT * FROM daily_journals WHERE user_id IS NULL AND date = ?';
                const stmt = this.db.prepare(sql);
                return { success: true, data: userId ? stmt.get(userId, date) : stmt.get(date) };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('db-save-daily-journal', (event, journal) => {
            try {
                const stmt = this.db.prepare(`
                    INSERT INTO daily_journals (user_id, date, goals, reflection, is_completed)
                    VALUES (@user_id, @date, @goals, @reflection, @is_completed)
                    ON CONFLICT(user_id, date) DO UPDATE SET
                        goals = @goals,
                        reflection = @reflection,
                        is_completed = @is_completed
                `);
                const data = {
                    user_id: journal.user_id || null,
                    date: journal.date,
                    goals: typeof journal.goals === 'string' ? journal.goals : JSON.stringify(journal.goals),
                    reflection: journal.reflection || '',
                    is_completed: journal.is_completed ? 1 : 0
                };
                stmt.run(data);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
}

module.exports = DBManager;
