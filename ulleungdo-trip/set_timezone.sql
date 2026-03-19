-- ==========================================
-- Ulleungdo Trip Database Timezone Setup
-- (Run this in Supabase SQL Editor)
-- 데이터베이스의 기본 시간을 한국 표준시(KST)로 변경합니다.
-- ==========================================

ALTER DATABASE postgres SET timezone TO 'Asia/Seoul';
