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
