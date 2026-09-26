-- =========================================================================
-- JCI ACCESS SYSTEM - DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- =========================================================================

-- 1. Create Status Enum
DO $$ BEGIN
    CREATE TYPE pass_status AS ENUM ('ACTIVE', 'CLAIMED', 'CHECKED_IN', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Attendees Table
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,          -- Invitation keycode entered on web (e.g., '1', '42', 'AC-9B2X71')
    qr_payload VARCHAR(128) NOT NULL UNIQUE,   -- Cryptographic hash inside QR (e.g., 'JCI:1:SIG-A1B2C3')
    full_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'DELEGATE',
    status pass_status NOT NULL DEFAULT 'ACTIVE',
    claimed_at TIMESTAMPTZ NULL,               -- When pass was claimed/burned on website
    checked_in_at TIMESTAMPTZ NULL,             -- When pass was scanned by Kotlin mobile app
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Performance Indexes for 0ms Scanner & Web Lookups
CREATE INDEX IF NOT EXISTS idx_attendees_code ON attendees(code);
CREATE INDEX IF NOT EXISTS idx_attendees_qr ON attendees(qr_payload);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON attendees(status);

-- 4. Row Level Security (RLS)
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow public read access by code" ON attendees;
DROP POLICY IF EXISTS "Allow anon update" ON attendees;

-- Allow web visitors to look up passes by code
CREATE POLICY "Allow public read access by code"
ON attendees
FOR SELECT
TO anon
USING (true);

-- Allow web portal to burn codes (ACTIVE -> CLAIMED) and mobile scanner to check in
CREATE POLICY "Allow anon update"
ON attendees
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- =========================================================================
-- SAMPLE TEST GUESTS
-- =========================================================================
INSERT INTO attendees (code, qr_payload, full_name, category, status)
VALUES
  ('1', 'JCI:1:SIG-A1B2C3', 'Senator Maria Santos', 'VIP GUEST', 'ACTIVE'),
  ('42', 'JCI:42:SIG-D4E5F6', 'John Mark Dela Cruz', 'DELEGATE', 'ACTIVE'),
  ('AC-9B2X71', 'JCI:AC-9B2X71:SIG-G7H8J9', 'Engr. Carlo Rodriguez', 'CHAPTER PRESIDENT', 'ACTIVE')
ON CONFLICT (code) DO UPDATE 
SET status = 'ACTIVE', claimed_at = NULL, checked_in_at = NULL;

-- =========================================================================
-- CONVENIENCE RESET COMMANDS (FOR TESTING)
-- =========================================================================
-- Reset a single attendee:
-- UPDATE attendees SET status = 'ACTIVE', claimed_at = NULL, checked_in_at = NULL WHERE code = '42';

-- Reset all attendees:
-- UPDATE attendees SET status = 'ACTIVE', claimed_at = NULL, checked_in_at = NULL;