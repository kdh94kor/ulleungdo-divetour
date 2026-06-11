-- ==========================================
-- Ulleungdo Trip CMS Database Schema (v12)
-- Add Settled Settlement Participants Support
-- ==========================================

-- expenses 테이블에 정산 완료된 개별 참여자 리스트 컬럼 추가 (UUID Array)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settled_participant_ids UUID[] DEFAULT '{}';
