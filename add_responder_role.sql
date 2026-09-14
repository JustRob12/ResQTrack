-- ==============================================================================
-- ResQTrack - MDRRMO Tarragona, Davao Oriental
-- Migration: Add Role 2 (Responders), Dispatch Tracking, and Completion Proof
-- Run this script in your Supabase SQL Editor:
-- ==============================================================================

-- 1. Ensure `profiles` table allows role 2
-- Roles:
-- 0 = Admin (MDRRMO Officer / Dispatcher)
-- 1 = Citizen / Normal People
-- 2 = Emergency Responder (Rescue Unit)

COMMENT ON COLUMN public.profiles.role IS '0 = Admin, 1 = Citizen, 2 = Responder';

-- 2. Add Responder Tracking & Completion Proof columns to `reports` (safe for existing tables)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_phone TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS mission_status TEXT DEFAULT 'pending';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_latitude DOUBLE PRECISION;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_longitude DOUBLE PRECISION;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS responder_updated_at TIMESTAMPTZ;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_image_url TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_images TEXT[];
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_reports_responder_id ON public.reports(responder_id);
CREATE INDEX IF NOT EXISTS idx_reports_mission_status ON public.reports(mission_status);

-- 4. Helper function to check if authenticated user is a Responder (Role = 2) or Admin (Role = 0)
CREATE OR REPLACE FUNCTION public.is_responder_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 2 OR role = 0)
  );
$$;

-- 5. RLS Policies on `reports` for Responders
-- A. Responders can view accepted (dispatched) reports and reports assigned to them
DROP POLICY IF EXISTS "Responders can view accepted reports" ON public.reports;
CREATE POLICY "Responders can view accepted reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_responder_or_admin() 
    OR status = 'accepted' 
    OR responder_id = auth.uid()
  );

-- B. Responders can update reports they are responding to (location, status, completion proof)
DROP POLICY IF EXISTS "Responders can update assigned reports" ON public.reports;
CREATE POLICY "Responders can update assigned reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_responder_or_admin()
      AND (responder_id IS NULL OR responder_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_responder_or_admin()
      AND (responder_id IS NULL OR responder_id = auth.uid())
    )
  );

-- 6. RLS Policy: Admins can update user profiles (to set citizen role to responder)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Enable Realtime on the `reports` table if not already enabled
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 8. Explicitly reload PostgREST schema cache so new columns are immediately available
NOTIFY pgrst, 'reload schema';
