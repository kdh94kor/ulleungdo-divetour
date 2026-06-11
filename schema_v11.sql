-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v11)
-- Add Custom Settlement Participants Support
-- ==========================================

-- expenses 테이블에 정산 참여 대상 리스트 컬럼 추가 (UUID Array)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT NULL;
