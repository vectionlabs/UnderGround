-- ============================================
-- UnderGround - Admin System Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Add admin columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_reason TEXT DEFAULT NULL;

-- Set Reddox as admin
UPDATE users SET role = 'admin' WHERE LOWER(username) = LOWER('Reddox');
