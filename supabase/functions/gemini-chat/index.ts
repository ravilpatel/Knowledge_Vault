import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

    const systemInstruction = `You are the core intelligence of "Knowledge Vault". Your job is to extract entities from user messages and return structured JSON.
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
}`

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { response_mime_type: 'application/json' }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
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
      const cleanText = resultText.replace(/^\s*```json/i, '').replace(/^\s*```/i, '').replace(/```\s*$/i, '').trim()
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
               await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                  method: 'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ chat_id: telegramChatId, text: `🔴 Urgent Task Added: ${r.title}\\nDue: ${r.due_date || "ASAP"}\\nKnowledge Vault` })
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
})
