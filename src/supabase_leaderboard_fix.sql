-- LEADERBOARD & STATS SYNC UPDATE
-- Run this in your Supabase SQL Editor to add leaderboard fields to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_consistency_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_pnl REAL DEFAULT 0;

-- Additional fields for social transparency if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0;

-- Ensure RLS allows selecting these fields (already covered by "Public profiles are viewable by everyone")
