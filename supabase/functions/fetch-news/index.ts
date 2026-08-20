import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()
    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!sbUrl || !sbKey) throw new Error('Missing Supabase credentials')
    const sb = createClient(sbUrl, sbKey)
    const groqKey = Deno.env.get('GROQ_API_KEY') || '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'

    const { data: setts } = await sb.from('user_settings').select('*').eq('user_id', userId).single()
    if (!setts) throw new Error('Settings not found')
    if (!setts.news_enabled) return new Response(JSON.stringify({ message: 'News disabled' }), { headers: corsHeaders })

    const topicsString = setts.news_topics || 'Indian policy, startups, technology'
    const topics = topicsString.split(',').map(t => t.trim()).filter(t => t.length > 0)

    const allNews = []

    // Fetch Google News for each topic
    for (const topic of topics) {
       try {
         const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-IN&gl=IN&ceid=IN:en`
         const r = await fetch(rssUrl)
         const text = await r.text()
         
         const items = text.match(/<item>([\s\S]*?)<\/item>/g) || []
         for (const it of items.slice(0, 5)) {
           const title = (it.match(/<title>([\s\S]*?)<\/title>/)||[,''])[1].replace(/<!\[CDATA\[(.*)\]\]>/,'$1')
           const link = (it.match(/<link>([\s\S]*?)<\/link>/)||[,''])[1]
           const desc = (it.match(/<description>([\s\S]*?)<\/description>/)||[,''])[1].replace(/<[^>]*>?/gm, '').substring(0,300)
           allNews.push({ title, link, description: desc, category: topic, source: 'Google News' })
         }
       } catch(e) { console.error('Failed fetching topic:', topic, e) }
    }

    let inserted = 0
    let summariesHTML = ''

    for (const n of allNews) {
      try {
        const routeResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'groq/compound-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are an Intel Analyst. Evaluate this news item. Score its relevance to Indian professionals (1-10) and write a 2-sentence summary. Output JSON: { "score": 8, "summary": "...", "relevant": true }' },
              { role: 'user', content: `Title: ${n.title}\n\nDesc: ${n.description}` }
            ]
          })
        })
        if (routeResp.ok) {
           const data = await routeResp.json()
           const content = data.choices[0].message.content
           const ai = JSON.parse(content)
           if (ai.relevant || ai.score >= 6) {
             const { error } = await sb.from('news_items').insert({
               user_id: userId,
               title: n.title,
               summary: ai.summary,
               url: n.link,
               source: n.source,
               category: n.category
             })
             if (!error) {
               inserted++
               summariesHTML += `<li style="margin-bottom: 15px"><strong>${n.title}</strong><br><em>${n.category}</em> - ${ai.summary}<br><a href="">Read more</a></li>`
             }
           }
        }
      } catch(e) {}
    }

    if (inserted > 0 && setts.smtp_host) {
      try {
        const trans = createTransport({ host: setts.smtp_host, port: setts.smtp_port, secure: false, auth: { user: setts.smtp_user, pass: setts.smtp_pass } })
        await trans.sendMail({
          from: setts.smtp_from, to: setts.notify_email || setts.smtp_user,
          subject: `Daily Intel Digest - ${new Date().toDateString()}`,
          html: `<h2>Intel Digest</h2><ul>${summariesHTML}</ul>`
        })
      } catch(e) { console.error('SMTP failed', e) }
    }

    return new Response(JSON.stringify({ success: true, fetched: allNews.length, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
