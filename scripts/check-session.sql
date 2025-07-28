-- Check specific session that was failing
SELECT 
  id,
  user_id,
  total_speaking_time,
  created_at,
  ended_at
FROM sessions
WHERE id = '45875395-a685-4a34-9987-4ae98663d53';

-- Check all active sessions for the user
SELECT 
  id,
  user_id,
  total_speaking_time,
  created_at,
  ended_at
FROM sessions
WHERE user_id = '044a4734-6ff1-465e-879a-544859605cfa'
  AND ended_at IS NULL
ORDER BY created_at DESC;

-- Check for any duplicate session IDs (shouldn't happen but let's verify)
SELECT 
  id,
  COUNT(*) as count
FROM sessions
GROUP BY id
HAVING COUNT(*) > 1;