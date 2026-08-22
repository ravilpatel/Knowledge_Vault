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
    const { message, userId, telegramBotToken, telegramChatId, panels, panelFields, vaultData } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const sb = createClient(sbUrl, sbKey)

    let panelsInstruction = '';
    if (panels && panels.length > 0) {
      panelsInstruction = `
In addition to the standard Note, Person, Company, Project, Technology, and Todo entries, you can manage "Panel Entries" for user-defined custom Panels.
Available Panels and their configured Fields:
${panels.map((p) => {
  const fields = (panelFields || []).filter((f) => f.panel_id === p.id);
  const fieldsStr = fields.map((f) => `- "${f.field_key}" (${f.field_label}, type: ${f.field_type}${f.options ? `, options: ${JSON.stringify(f.options)}` : ''}${f.is_required ? ', required' : ''})`).join('\n');
  return `Panel Name: "${p.name}" (referred in messages by name)\nFields:\n${fieldsStr}`;
}).join('\n\n')}

If the user request maps to one of the custom Panels above, add an action of type "add_panel_entry" to the "actions" array:
Action Schema:
{ "type": "add_panel_entry", "panel_name": "[Exact Panel Name]", "data": { "[field_key_1]": "[extracted_value_1]", ... } }
Extract and map fields precisely based on their type. Array values like "tags" or "people" (references to People names/IDs, matched if possible) should be arrays.
`;
    }

    const systemInstruction = `You are the core intelligence of "Knowledge Vault". Your job is to extract entities from user messages and return structured JSON, and also act as a conversational assistant.
You can manage Vault Notes (Ideas), People, Companies, Projects, Technologies, and Tasks (Todos).

CRITICAL DIRECTIVES:
1. Limit your knowledge exclusively to the data provided within this application context (provided below). Do NOT use outside knowledge or external data.
2. If the user's request is ambiguous or lacks required information, use the "reply" field to ask follow-up questions directly to the user.
3. Take data inputs directly and structure them into the JSON format requested.
4. When the user asks a question about their data, use the Vault Data provided below to formulate a helpful answer in the "reply" field. You do not need to provide any "actions" if they are just asking a question.

VAULT DATA (YOUR EXCLUSIVE KNOWLEDGE BASE):
${vaultData ? JSON.stringify(vaultData) : 'No data available yet.'}

Possible actions for Vault: "add_note", "add_person", "add_company", "add_project", "add_technology", "update_...".
If the user is adding a task/reminder, provide it in the "todos" array.

${panelsInstruction}

JSON Schema:
{
  "reply": "Conversational reply confirming actions taken, answering the user's question based on Vault Data, or asking follow-up questions if more data is required.",
  "actions": [ 
    { "type": "add_note", "data": { "title": "...", "description": "..." } },
    { "type": "add_panel_entry", "panel_name": "...", "data": { ... } } 
  ],
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
