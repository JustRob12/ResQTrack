-- ==============================================================================
-- FIX: Infinite Recursion (Error 42P17) in Supabase RLS Policies
-- Run this in your Supabase SQL Editor:
-- ==============================================================================

-- 1. Create SECURITY DEFINER function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 0
  );
$$;

-- 2. Fix the "Admins can view all profiles" policy on public.profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Fix the admin policies on public.reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update report status" ON public.reports;
CREATE POLICY "Admins can update report status"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Backfill any existing users from auth.users into public.profiles
INSERT INTO public.profiles (id, email, full_name, phone_number, gender, date_of_birth, role)
SELECT 
  id, 
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data->>'full_name', 'Citizen'),
  raw_user_meta_data->>'phone_number',
  raw_user_meta_data->>'gender',
  CASE 
    WHEN raw_user_meta_data->>'date_of_birth' IS NOT NULL 
         AND raw_user_meta_data->>'date_of_birth' <> '' 
         AND raw_user_meta_data->>'date_of_birth' <> 'Not specified'
    THEN (raw_user_meta_data->>'date_of_birth')::date 
    ELSE NULL 
  END,
  COALESCE((raw_user_meta_data->>'role')::integer, 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
