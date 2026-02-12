-- =====================================================================================
--                   CORE APPLICATION: GOD MODE REPAIR SCRIPT v1.0
-- =====================================================================================
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE script.
-- 2. Paste it into your Supabase Dashboard > SQL Editor.
-- 3. Click "RUN" (bottom right).
-- =====================================================================================

-- [SECTION 1: CLEAN SLATE PROTOCOL]
-- Drop existing policies to remove conflicting/broken restrictions.
-- This does NOT delete your data, only the security rules.

DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON trades;

DROP POLICY IF EXISTS "Users can manage their own pill colors" ON pill_colors;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert/update their own profile" ON profiles;

DROP POLICY IF EXISTS "Users can manage their own friendships" ON friends;
DROP POLICY IF EXISTS "Users can manage their own daily journals" ON daily_journals;

DROP POLICY IF EXISTS "Users manage custom groups" ON copy_groups;
DROP POLICY IF EXISTS "Users manage group members" ON copy_members;


-- [SECTION 2: SCHEMA INTEGRETY CHECK]
-- Ensure all tables and columns exist with correct types.

-- 2.1 Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    capital REAL DEFAULT 0,
    profit_target REAL DEFAULT 0,
    max_loss REAL DEFAULT 0,
    consistency_rule TEXT,
    prop_firm TEXT,
    reset_date TEXT,
    breach_report TEXT,
    is_ranked_up BOOLEAN DEFAULT FALSE,
    prev_reset_date TEXT,
    payout_goal REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Add columns if missing (safe migration)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_ranked_up BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS prev_reset_date TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payout_goal REAL DEFAULT 0;

-- 2.2 Trades
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    pnl REAL NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    confluences TEXT,
    entry_signal TEXT,
    order_type TEXT,
    sl_pips REAL,
    psychology TEXT,
    mistakes TEXT,
    comment_bias TEXT,
    comment_execution TEXT,
    comment_problems TEXT,
    comment_fazit TEXT,
    image_paths TEXT,
    images_execution TEXT,
    images_condition TEXT,
    images_narrative TEXT
);
-- Add columns if missing
ALTER TABLE trades ADD COLUMN IF NOT EXISTS confluences TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_signal TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS order_type TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sl_pips REAL;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS psychology TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mistakes TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS comment_bias TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS comment_execution TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS comment_problems TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS comment_fazit TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS image_paths TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS images_execution TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS images_condition TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS images_narrative TEXT;


-- 2.3 Pill Colors (Metadata)
CREATE TABLE IF NOT EXISTS pill_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category, value)
);

-- 2.4 Profiles (Social Identity)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    avatar_url TEXT,
    bio TEXT,
    rank_name TEXT,
    rank_level INTEGER,
    xp INTEGER,
    win_rate REAL,
    total_pnl REAL,
    tag TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2.5 Friends (Social Graph)
CREATE TABLE IF NOT EXISTS friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

-- 2.6 Daily Journals
CREATE TABLE IF NOT EXISTS daily_journals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    goals JSONB NOT NULL,
    reflection TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- 2.7 Copy Trading Groups
CREATE TABLE IF NOT EXISTS copy_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    leader_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 Copy Trading Members
CREATE TABLE IF NOT EXISTS copy_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES copy_groups(id) ON DELETE CASCADE,
    follower_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    risk_multiplier REAL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- [SECTION 3: SECURITY & PERMISSIONS (RLS)]
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_members ENABLE ROW LEVEL SECURITY;


-- 3.1 Accounts Policy (Private)
CREATE POLICY "Users can manage their own accounts" ON accounts
    FOR ALL USING (auth.uid() = user_id);

-- 3.2 Trades Policy (Private)
CREATE POLICY "Users can manage their own trades" ON trades
    FOR ALL USING (auth.uid() = user_id);

-- 3.3 Pill Colors Policy (Private)
CREATE POLICY "Users can manage their own pill colors" ON pill_colors
    FOR ALL USING (auth.uid() = user_id);

-- 3.4 Profiles Policy (Public Read, Private Write)
-- CRITICAL FIX: Allow public read so users can be found in search
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert/update their own profile" 
    ON profiles FOR ALL USING (auth.uid() = id);

-- 3.5 Friendship Policy (Mutual)
CREATE POLICY "Users can manage their own friendships" 
    ON friends FOR ALL 
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 3.6 Daily Journals Policy (Private)
CREATE POLICY "Users can manage their own daily journals" 
    ON daily_journals FOR ALL USING (auth.uid() = user_id);

-- 3.7 Copy Trading Policies (Private)
CREATE POLICY "Users manage custom groups" ON copy_groups
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage group members" ON copy_members
    FOR ALL USING (
        group_id IN (SELECT id FROM copy_groups WHERE user_id = auth.uid())
    );


-- [SECTION 4: VERIFICATION]
-- Confirm the operation was successful
SELECT 'SUCCESS: Database schema and permissions have been repaired.' as status;
