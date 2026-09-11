-- ==============================================================================
-- ResQTrack - MDRRMO Tarragona, Davao Oriental
-- Database Schema for User Profiles, Reports, Roles, and Authentication Triggers
-- ==============================================================================

-- 1. Create or update the `profiles` table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  gender TEXT,
  date_of_birth DATE,
  role INTEGER NOT NULL DEFAULT 1, -- 0 for admin, 1 for normal people
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- If the table already existed without phone_number, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
  END IF;
END $$;

-- 2. Indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: Security Definer function to check admin role without recursive RLS
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

-- 4. RLS Policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow insert profile" ON public.profiles;
CREATE POLICY "Allow insert profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Create the `reports` table for incident reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'video'
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  rejection_reason TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Foreign key to profiles for joined queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_reports_profiles'
  ) THEN
    ALTER TABLE public.reports 
    ADD CONSTRAINT fk_reports_profiles 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes on reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies on reports
-- A. Citizens can insert their own reports
DROP POLICY IF EXISTS "Citizens can insert their own reports" ON public.reports;
CREATE POLICY "Citizens can insert their own reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- B. Citizens can view their own reports
DROP POLICY IF EXISTS "Citizens can view their own reports" ON public.reports;
CREATE POLICY "Citizens can view their own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- C. Admins can view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- D. Admins can update reports (Accept / Reject)
DROP POLICY IF EXISTS "Admins can update report status" ON public.reports;
CREATE POLICY "Admins can update report status"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- E. Admins can delete reports
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Automatic trigger on new user registration (including phone_number)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone_number,
    gender,
    date_of_birth,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen'),
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'gender',
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
           AND NEW.raw_user_meta_data->>'date_of_birth' <> '' 
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
      ELSE NULL 
    END,
    COALESCE((NEW.raw_user_meta_data->>'role')::integer, 1) -- Defaults to 1 (normal people)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    gender = EXCLUDED.gender,
    date_of_birth = EXCLUDED.date_of_birth,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Backfill any existing users created before the trigger
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
    THEN (raw_user_meta_data->>'date_of_birth')::date 
    ELSE NULL 
  END,
  COALESCE((raw_user_meta_data->>'role')::integer, 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- HELPER: Promote a user to Admin (Role: 0)
-- 
-- UPDATE public.profiles 
-- SET role = 0 
-- WHERE email = 'admin@tarragona.gov.ph';
-- 
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '0')
-- WHERE email = 'admin@tarragona.gov.ph';
-- ==============================================================================
