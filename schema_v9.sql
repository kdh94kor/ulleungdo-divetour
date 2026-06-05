-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v9)
-- Add Profiles, Expenses, and Expense Histories for Settlement
-- ==========================================

-- 1. Profiles Table (Auto-synced from frontend)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Backfill existing users (Run this once)
INSERT INTO public.profiles (id, email, display_name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    created_by_email TEXT,
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Expense Histories Table
CREATE TABLE IF NOT EXISTS public.expense_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID,
    modified_by_email TEXT NOT NULL,
    modified_by_name TEXT,
    old_data JSONB,
    new_data JSONB,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.expense_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.expense_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.expense_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);
