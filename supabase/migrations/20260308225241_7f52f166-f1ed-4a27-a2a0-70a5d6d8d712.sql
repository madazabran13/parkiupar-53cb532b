
-- Schedule daily check at 8:00 AM UTC (3:00 AM Colombia time)
SELECT cron.schedule(
  'check-plan-expirations',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xqgwetpzuslklycflebu.supabase.co/functions/v1/check-expirations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ3dldHB6dXNsa2x5Y2ZsZWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg3MTQsImV4cCI6MjA4ODQzNDcxNH0.RCPe2oeIkulav9GjOzMYDJHSFyxuZJHAp2hyVSz-C2Y"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
