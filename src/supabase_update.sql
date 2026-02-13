-- Run this script in your Supabase SQL Editor to enable full sync capabilities

-- 1. Update Accounts Table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_ranked_up BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS prev_reset_date TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payout_goal REAL DEFAULT 0;

-- 2. Update Trades Table
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

-- 3. Create Pill Colors Table (if missing)
CREATE TABLE IF NOT EXISTS pill_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category, value)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE pill_colors ENABLE ROW LEVEL SECURITY;

-- 5. Create Policy for Pill Colors
CREATE POLICY "Users can manage their own pill colors" ON pill_colors
    FOR ALL USING (auth.uid() = user_id);

-- 6. Add Profiles Table (Social)
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can update own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- 7. Add Friends Table
CREATE TABLE IF NOT EXISTS friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own friendships" ON friends
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 8. Add Daily Journals Table
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

ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own daily journals" ON daily_journals
    FOR ALL USING (auth.uid() = user_id);

-- 9. Add Dashboard Config to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
    "active": [
        {"id": "totalRisk", "visible": true, "order": 0},
        {"id": "overviewStats", "visible": true, "order": 1},
        {"id": "accountsList", "visible": true, "order": 2},
        {"id": "recentTrades", "visible": true, "order": 3},
        {"id": "analyticsCharts", "visible": true, "order": 4}
    ],
    "templates": {}
}';

-- 10. Mindset Matrix Updates
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sentiment_pre TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sentiment_post TEXT;

-- Update profiles with default psychology settings if not exists
UPDATE profiles SET dashboard_config = dashboard_config || '{"reveng_lockout_enabled": true, "reveng_lockout_threshold": 3}'::jsonb 
WHERE dashboard_config->>'reveng_lockout_enabled' IS NULL;
