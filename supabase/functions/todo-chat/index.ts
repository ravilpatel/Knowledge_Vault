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
    const { message, userId, telegramBotToken, telegramChatId } = await req.json()

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const systemInstruction = `You are a smart task management assistant using the Eisenhower Matrix methodology.
Parse the user's task input and extract structured todo items.

Eisenhower Matrix rules:
- urgent=true, important=true → Q1: Do First (crises, deadlines, emergencies)
- urgent=false, important=true → Q2: Schedule (planning, development, important goals)
- urgent=true, important=false → Q3: Delegate (interruptions, some meetings, some emails)
- urgent=false, important=false → Q4: Eliminate (time wasters, trivial tasks)

Keywords for urgency: "today", "ASAP", "urgent", "immediately", "by tomorrow", "deadline", "due soon", "critical", specific near dates
Keywords for importance: "important", "critical", "key", "must", "priority", "goal", "project", "strategic"

For EACH task detected, extract:
- title: string (concise task title)
- description: string (optional detail)
- urgent: boolean
- important: boolean
- due_date: string | null (YYYY-MM-DD format, or null if not specified; "tomorrow" = next day, "Friday" = next occurrence)

Today's date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON:
{
  "reply": "Friendly confirmation of tasks added, with their quadrant assignments",
  "todos": [
    {
      "title": string,
      "description": string,
      "urgent": boolean,
      "important": boolean,
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
        const row = {
          user_id: userId,
          title: todo.title || 'Untitled Task',
          description: todo.description || '',
          urgent: Boolean(todo.urgent),
          important: Boolean(todo.important),
          due_date: todo.due_date || null,
          completed: false,
          notify_telegram: Boolean(telegramBotToken && telegramChatId),
        }
        const { data: inserted, error: insertErr } = await sb.from('todos').insert(row).select().single()
        if (insertErr) {
          console.error('Todo insert error:', insertErr.message)
          continue
        }

        // Send Telegram notification for Q1 tasks (urgent + important)
        if (todo.urgent && todo.important && telegramBotToken && telegramChatId) {
          const dueStr = todo.due_date ? `📅 Due: ${todo.due_date}` : '⚡ Due: ASAP'
          await sendTelegram(
            telegramBotToken,
            telegramChatId,
            `🔴 <b>Q1 Task Added — Do First!</b>\n\n📌 ${todo.title}\n${dueStr}\n\n<i>Knowledge Vault</i>`
          )
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('todo-chat error:', error.message)
    return new Response(JSON.stringify({ error: error.message, todos: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
