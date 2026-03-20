-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v10 & v11 Integrated)
-- Settlement Completion & Per-User Packing Checks
-- ==========================================

-- 1. [정산] expenses 테이블에 정산완료 여부 추가
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- 2. [정산] 정산 이력 기록을 위한 settlement_histories 테이블 생성
CREATE TABLE IF NOT EXISTS public.settlement_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    modified_by_email TEXT NOT NULL,
    modified_by_name TEXT,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.settlement_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.settlement_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.settlement_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. [준비물] 개인별 준비물 체크 저장을 위한 packing_checks 테이블 생성
-- (주의: 초기 모델이었던 packing_items.is_packed는 사용하지 않는 것으로 폐기/무시)
CREATE TABLE IF NOT EXISTS public.packing_checks (
    packing_item_id UUID REFERENCES public.packing_items(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (packing_item_id, profile_id)
);

ALTER TABLE public.packing_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to auth" ON public.packing_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON public.packing_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);
