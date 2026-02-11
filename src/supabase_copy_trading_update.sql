-- Run this to enable Copy Trading Sync support

-- 1. Create Copy Groups Table
CREATE TABLE IF NOT EXISTS copy_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    leader_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Copy Members Table
CREATE TABLE IF NOT EXISTS copy_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES copy_groups(id) ON DELETE CASCADE,
    follower_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    risk_multiplier REAL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Security
ALTER TABLE copy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_members ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
CREATE POLICY "Users manage custom groups" ON copy_groups
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage group members" ON copy_members
    FOR ALL USING (
        group_id IN (SELECT id FROM copy_groups WHERE user_id = auth.uid())
    );
