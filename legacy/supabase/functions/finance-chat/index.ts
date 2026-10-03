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
    const { message, userId } = await req.json()

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Supabase Secrets')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date().toISOString().split('T')[0]

    const systemInstruction = `You are a personal finance tracker assistant for an Indian user. Your job is to parse expense entries from natural language and return structured data.

The user may enter one or multiple expenses in a single message, in formats like:
- "10 - Tea"
- "450 - Bus ticket (Ahmedabad to Rajkot) will be reimbursed in salary"
- "20 - Digi-gold investment"
- "Spent 500 on groceries"
- "200 coffee, 150 auto, 50 water"
- "Paid 12000 rent"

For EACH expense detected, extract:
- amount: number (in INR, without currency symbols)
- description: string (clean, concise description)
- category: exactly one of [Food, Transport, Investment, Health, Entertainment, Shopping, Utilities, Education, Reimbursable, Other]
  - Tea/coffee/food/meals → Food
  - Bus/auto/cab/travel/petrol → Transport
  - Gold/stocks/SIP/crypto → Investment
  - Medicine/doctor → Health
  - Movies/games → Entertainment
  - Groceries/clothes/online shopping → Shopping
  - Rent/electricity/internet → Utilities
  - Courses/books → Education
  - Anything that will be reimbursed → Reimbursable
- reimbursable: boolean (true if message mentions: reimbursed, salary, company, office will pay, expense claim)
- reimbursable_note: string or null (e.g., "Reimbursed in salary", "Company expense" — only if reimbursable is true)

Respond ONLY with valid JSON:
{
  "reply": "A friendly confirmation message listing what was logged, with total amount in ₹",
  "expenses": [
    {
      "amount": number,
      "description": string,
      "category": string,
      "reimbursable": boolean,
      "reimbursable_note": string | null
    }
  ]
}`

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { response_mime_type: 'application/json' }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini API error')
    }

    const geminiData = await response.json()
    const resultText = geminiData.candidates[0].content.parts[0].text
    const cleanText = resultText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleanText)

    // Insert expenses into DB
    if (parsed.expenses && parsed.expenses.length > 0 && userId) {
      const rows = parsed.expenses.map((exp: any) => ({
        user_id: userId,
        amount: Number(exp.amount) || 0,
        description: exp.description || '',
        category: exp.category || 'Other',
        reimbursable: Boolean(exp.reimbursable),
        reimbursable_note: exp.reimbursable_note || null,
        date: today,
      }))
      const { error: insertErr } = await sb.from('expenses').insert(rows)
      if (insertErr) console.error('Insert error:', insertErr.message)
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('finance-chat error:', error.message)
    return new Response(JSON.stringify({ error: error.message, expenses: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
