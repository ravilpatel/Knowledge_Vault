import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('Telegram send failed:', e)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, userId, telegramBotToken, telegramChatId, mode } = await req.json()

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // If mode is breakdown, generate subtask breakdown for a given task title
    if (mode === 'breakdown') {
      const breakdownPrompt = `You are a productivity expert. Given a task title and optional description, break it down into 3 to 5 clear, actionable, concise subtasks.
Respond ONLY with a JSON object:
{
  "subtasks": [
    { "text": "Actionable step 1" },
    { "text": "Actionable step 2" }
  ]
}

Task: ${message}`

      const groqKey = Deno.env.get('GROQ_API_KEY') || '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'
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'groq/compound-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'user', content: breakdownPrompt }
          ]
        })
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Groq API error: ${err}`)
      }

      const groqData = await response.json()
      const resultText = groqData.choices[0].message.content
      const cleanText = resultText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
      const parsed = JSON.parse(cleanText)

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const systemInstruction = `You are a smart task management assistant for Knowledge Vault.
Parse the user's task input and extract structured todo items.

Priority mapping rules:
- Critical/Urgent + High Impact: priority "p1" (urgent=true, important=true)
- High priority / Important strategic: priority "p2" (urgent=false, important=true)
- Medium / Quick / Delegable: priority "p3" (urgent=true, important=false)
- Low priority / Trivial: priority "p4" (urgent=false, important=false)

For EACH task detected, extract:
- title: string (concise task title)
- description: string (optional detail)
- priority: "p1" | "p2" | "p3" | "p4"
- status: "todo" | "in_progress" | "blocked" | "done" (default "todo")
- tags: string[] (e.g. ["Work", "Design", "Urgent"])
- subtasks: Array of { "text": string } (if user mentions sub-steps)
- due_date: string | null (YYYY-MM-DD format, or null if not specified; "tomorrow" = next day, "Friday" = next occurrence)

Today's date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON:
{
  "reply": "Friendly confirmation of tasks added with their priorities and due dates",
  "todos": [
    {
      "title": string,
      "description": string,
      "priority": "p1"|"p2"|"p3"|"p4",
      "status": "todo",
      "tags": string[],
      "subtasks": [ { "text": string } ],
      "due_date": string | null
    }
  ]
}`

    const groqKey = Deno.env.get('GROQ_API_KEY') || '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'
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'groq/compound-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: message }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API error: ${err}`)
    }

    const groqData = await response.json()
    const resultText = groqData.choices[0].message.content
    const cleanText = resultText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleanText)

    // Insert todos into DB
    if (parsed.todos && parsed.todos.length > 0 && userId) {
      for (const todo of parsed.todos) {
        const priority = todo.priority || 'p3'
        const isUrgent = priority === 'p1' || priority === 'p3'
        const isImportant = priority === 'p1' || priority === 'p2'

        const formattedSubtasks = (todo.subtasks || []).map((s: any, idx: number) => ({
          id: `st-${Date.now()}-${idx}`,
          text: typeof s === 'string' ? s : (s.text || ''),
          completed: false
        }))

        const row = {
          user_id: userId,
          title: todo.title || 'Untitled Task',
          description: todo.description || '',
          status: todo.status || 'todo',
          priority: priority,
          urgent: isUrgent,
          important: isImportant,
          tags: todo.tags || [],
          subtasks: formattedSubtasks,
          due_date: todo.due_date || null,
          completed: todo.status === 'done',
          notify_telegram: Boolean(telegramBotToken && telegramChatId),
        }
        const { data: inserted, error: insertErr } = await sb.from('todos').insert(row).select().single()
        if (insertErr) {
          console.error('Todo insert error:', insertErr.message)
          continue
        }

        // Send Telegram notification for P1 tasks
        if (priority === 'p1' && telegramBotToken && telegramChatId) {
          const dueStr = todo.due_date ? `📅 Due: ${todo.due_date}` : '⚡ Due: ASAP'
          await sendTelegram(
            telegramBotToken,
            telegramChatId,
            `🔴 <b>P1 Urgent Task Added!</b>\n\n📌 ${todo.title}\n${dueStr}\n\n<i>Knowledge Vault</i>`
          )
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('todo-chat error:', error.message)
    return new Response(JSON.stringify({ error: error.message, todos: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
