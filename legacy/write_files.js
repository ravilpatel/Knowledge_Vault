const fs = require('fs');

const geminiChat = import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, userId, telegramBotToken, telegramChatId } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const sb = createClient(sbUrl, sbKey)

    const systemInstruction = \\\You are the core intelligence of "Knowledge Vault". Your job is to extract entities from user messages and return structured JSON.
You can manage Vault Notes, People, Companies, Projects, Technologies, as well as Financial Expenses and Tasks (Todos).

Possible actions for Vault: "add_note", "add_person", "add_company", "add_project", "add_technology", "update_...".
If the user is logging an expense, provide it in the "expenses" array.
If the user is adding a task/reminder, provide it in the "todos" array.

JSON Schema:
{
  "reply": "Conversational reply confirming actions taken.",
  "actions": [ { "type": "add_note", "data": { "title": "...", "description": "..." } } ],
  "expenses": [ { "amount": 100, "description": "Dinner", "category": "Food", "reimbursable": false } ],
  "todos": [ { "title": "Buy milk", "description": "", "urgent": true, "important": false, "due_date": null } ]
}\\\;

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { response_mime_type: 'application/json' }
    }

    const response = await fetch(
      \\\https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\\\\\\,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    )

    if (!response.ok) {
        const err = await response.text()
        throw new Error('Gemini API error: ' + err)
    }

    const geminiData = await response.json()
    const resultText = geminiData.candidates[0].content.parts[0].text
    
    let parsedResult
    try {
      const cleanText = resultText.replace(/^\\\\s*\\\\\\\\\json/i, '').replace(/^\\\\s*\\\\\\\\\/i, '').replace(/\\\\\\\\\\\\\s*$/i, '').trim()
      parsedResult = JSON.parse(cleanText)
    } catch (e) {
      throw new Error('Invalid JSON format returned from Gemini')
    }

    // Insert Expenses
    if (parsedResult.expenses && parsedResult.expenses.length > 0) {
       const rows = parsedResult.expenses.map((e) => ({
          user_id: userId,
          amount: e.amount || 0,
          description: e.description || '',
          category: e.category || 'Other',
          reimbursable: Boolean(e.reimbursable),
          reimbursable_note: e.reimbursable_note || null,
          date: new Date().toISOString().split('T')[0]
       }))
       await sb.from('expenses').insert(rows)
    }

    // Insert Todos
    if (parsedResult.todos && parsedResult.todos.length > 0) {
       const rows = parsedResult.todos.map((t) => ({
          user_id: userId,
          title: t.title || 'Untitled Task',
          description: t.description || '',
          urgent: Boolean(t.urgent),
          important: Boolean(t.important),
          due_date: t.due_date || null
       }))
       await sb.from('todos').insert(rows)
       
       // Telegram Notification logic
       if (telegramBotToken && telegramChatId) {
         for (const r of rows) {
            if (r.urgent && r.important) {
               await fetch(\\\https://api.telegram.org/bot\\\/sendMessage\\\, {
                  method: 'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ chat_id: telegramChatId, text: \\\?? Urgent Task Added: \\\\\\\nDue: \\\\\\\nKnowledge Vault\\\ })
               }).catch(e=>console.error("Telegram fail:", e))
            }
         }
       }
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
});

const fetchNews = import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
         const rssUrl = \\\https://news.google.com/rss/search?q=\\\&hl=en-IN&gl=IN&ceid=IN:en\\\
         const r = await fetch(rssUrl)
         const text = await r.text()
         
         const items = text.match(/<item>([\\\\s\\\\S]*?)<\\/item>/g) || []
         for (const it of items.slice(0, 5)) {
           const title = (it.match(/<title>([\\\\s\\\\S]*?)<\\/title>/)||[,''])[1].replace(/<!\\\\[CDATA\\\\[(.*)\\\\]\\\\]>/,'')
           const link = (it.match(/<link>([\\\\s\\\\S]*?)<\\/link>/)||[,''])[1]
           const desc = (it.match(/<description>([\\\\s\\\\S]*?)<\\/description>/)||[,''])[1].replace(/<[^>]*>?/gm, '').substring(0,300)
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
          headers: { 'Authorization': \\\Bearer \\\\\\, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'groq/compound-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are an Intel Analyst. Evaluate this news item. Score its relevance to Indian professionals (1-10) and write a 2-sentence summary. Output JSON: { "score": 8, "summary": "...", "relevant": true }' },
              { role: 'user', content: \\\Title: \\\\\\\n\\\\nDesc: \\\\\\ }
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
               summariesHTML += \\\<li style="margin-bottom: 15px"><strong>\\\</strong><br><em>\\\</em> - \\\<br><a href="\\\">Read more</a></li>\\\
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
          subject: \\\Daily Intel Digest - \\\\\\,
          html: \\\<h2>Intel Digest</h2><ul>\\\</ul>\\\
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
});

fs.writeFileSync('d:\\\\Knowledge_Vault\\\\supabase\\\\functions\\\\gemini-chat\\\\index.ts', geminiChat);
fs.writeFileSync('d:\\\\Knowledge_Vault\\\\supabase\\\\functions\\\\fetch-news\\\\index.ts', fetchNews);

