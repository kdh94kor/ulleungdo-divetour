-- Supabase Schema for Ulleungdo Trip (Example)
-- You can run this in Supabase SQL Editor to track checklist state or comments later if needed

CREATE TABLE IF NOT EXISTS public.trip_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Basic web version uses LocalStorage for the packing list for simplicity,
-- but you could extend this schema to sync packing lists for each user.
