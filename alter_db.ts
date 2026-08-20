import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const sbUrl = Deno.env.get('SUPABASE_URL')
const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!sbUrl || !sbKey) throw new Error('Missing credentials')
const sb = createClient(sbUrl, sbKey)

async function run() {
  const { data, error } = await sb.rpc('exec_sql', { sql: "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS news_topics TEXT DEFAULT 'Indian policy, startups, technology';" })
  if (error) console.error(error)
  else console.log('Added news_topics')
}
run()
