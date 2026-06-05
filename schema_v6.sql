-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v6)
-- Adds Packing Histories & Who Created
-- ==========================================

ALTER TABLE public.packing_items 
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

CREATE TABLE IF NOT EXISTS public.packing_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    packing_item_id UUID,
    modified_by_email TEXT NOT NULL,
    modified_by_name TEXT,
    old_data JSONB,
    new_data JSONB,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.packing_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.packing_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.packing_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);
