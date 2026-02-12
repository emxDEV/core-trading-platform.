-- MASTER SUPABASE RESET & CONFIGURATION SCRIPT
-- Run this ENTIRE script in your Supabase Dashboard SQL Editor to allow public access and fix RLS policies for Social Features.

-- 1. DROP EXISTING POLICIES (To prevent conflicts)
DROP POLICY IF EXISTS "Users can manage their own pill colors" ON pill_colors;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own friendships" ON friends;
DROP POLICY IF EXISTS "Users can manage their own daily journals" ON daily_journals;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- 2. ENABLE TABLES & SECURITY
ALTER TABLE pill_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;

-- 3. CREATE ROBUST POLICIES

-- Profiles: Allow ANYONE to view profiles (for Social Search), but only OWNER to edit
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true); -- Allows searching for friends before they are friends

CREATE POLICY "Users can insert/update their own profile" 
ON profiles FOR ALL 
USING (auth.uid() = id);

-- Friends: Allow users to see and manage their own friendships
CREATE POLICY "Users can manage their own friendships" 
ON friends FOR ALL 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Daily Journals: Private
CREATE POLICY "Users can manage their own daily journals" 
ON daily_journals FOR ALL 
USING (auth.uid() = user_id);

-- Pill Colors: Private
CREATE POLICY "Users can manage their own pill colors" 
ON pill_colors FOR ALL 
USING (auth.uid() = user_id);

-- 4. ENSURE TABLES EXIST (Idempotent)
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

CREATE TABLE IF NOT EXISTS friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id)
);
