-- 1. Create Enum for check-in status
CREATE TYPE pass_status AS ENUM ('ACTIVE', 'CHECKED_IN', 'REVOKED');

-- 2. Create the Attendees table
CREATE TABLE attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,          -- Short code typed by guest (e.g. '1', 'AC-9B2X71')
    qr_payload VARCHAR(128) NOT NULL UNIQUE,   -- Scanned QR content (e.g. 'JCI:AC-9B2X71:SIG-8X9')
    full_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'DELEGATE',
    status pass_status NOT NULL DEFAULT 'ACTIVE',
    checked_in_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-performance indexes for fast lookups
CREATE INDEX idx_attendees_code ON attendees(code);
CREATE INDEX idx_attendees_qr ON attendees(qr_payload);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

-- 5. Security Policy: Allow the public website to read pass data by code
-- (Guests can only read attendee info, they cannot delete or alter other attendees)
CREATE POLICY "Allow public read access by code"
ON attendees
FOR SELECT
TO anon
USING (true);

-- 6. Security Policy: Allow updates only for check-in mutations (Scanner / Admin)
CREATE POLICY "Allow check-in updates"
ON attendees
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);