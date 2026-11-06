-- =====================================================================
-- ANTROTHON'27 — SUPABASE POSTGRESQL SCHEMA
-- =====================================================================
-- Run this script in your Supabase Dashboard:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select project 'gekdsmxyvjejtmdmmapp'
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New query", paste the contents below, and click "Run"
-- =====================================================================

-- 1. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id BIGSERIAL PRIMARY KEY,
    team_code VARCHAR(32) UNIQUE NOT NULL,
    team_name VARCHAR(128) NOT NULL,
    college_name VARCHAR(256),
    track VARCHAR(128) NOT NULL,
    
    -- Legacy fields
    project_title VARCHAR(256),
    project_synopsis TEXT,
    
    -- SIH Idea Dossier
    idea_title VARCHAR(100),
    idea_description TEXT,
    idea_summary TEXT,
    idea_ppt_filename VARCHAR(256),
    idea_ppt_path VARCHAR(256),
    
    -- Leader Information
    leader_name VARCHAR(128) NOT NULL,
    leader_email VARCHAR(128) NOT NULL,
    leader_phone VARCHAR(20) NOT NULL,
    leader_college VARCHAR(256) NOT NULL,
    leader_department VARCHAR(128) NOT NULL,
    leader_year VARCHAR(32) NOT NULL,
    leader_gender VARCHAR(32),
    leader_id_number VARCHAR(64),
    
    -- Members JSON
    member_count INTEGER DEFAULT 4,
    members_data TEXT DEFAULT '[]',
    
    -- Payment Details
    amount_paid INTEGER DEFAULT 300,
    payment_status VARCHAR(32) DEFAULT 'pending',
    payment_mode VARCHAR(32) DEFAULT 'razorpay',
    razorpay_order_id VARCHAR(128),
    razorpay_payment_id VARCHAR(128),
    razorpay_signature VARCHAR(256),
    payment_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Finalist & Admin review
    status VARCHAR(32) DEFAULT 'submitted',
    admin_notes TEXT,
    finalist_paid BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_registrations_leader_email ON public.registrations(leader_email);
CREATE INDEX IF NOT EXISTS idx_registrations_team_code ON public.registrations(team_code);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations(payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_team_name_lower ON public.registrations(LOWER(team_name));

-- 2. Create preregistration_alerts table
CREATE TABLE IF NOT EXISTS public.preregistration_alerts (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    college VARCHAR(256),
    track_interest VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_preregistration_alerts_email ON public.preregistration_alerts(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preregistration_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert for hackathon platform
CREATE POLICY "Allow public read access on registrations" ON public.registrations
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on registrations" ON public.registrations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on registrations" ON public.registrations
    FOR UPDATE USING (true);

CREATE POLICY "Allow service role full access on registrations" ON public.registrations
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow public insert on alerts" ON public.preregistration_alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role full access on alerts" ON public.preregistration_alerts
    USING (auth.role() = 'service_role');

