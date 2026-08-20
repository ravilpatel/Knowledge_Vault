import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, image, vaultData } = await req.json()
    
    // Get the Gemini API key from Supabase Secrets
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in Supabase Secrets')
    }

    const systemInstruction = `You are an AI assistant for Knowledge Vault, a personal knowledge repository app.
You have access to the user's current vault data. You can answer questions about it, or propose actions to add or update information.

Respond ONLY with a JSON object containing:
- "reply": A conversational response answering the user's query or explaining what action you're taking.
- "actions": An optional array of action objects.

If the user asks a question about their existing data (e.g., "fetch my last notes", "who is X?"), simply answer it in the "reply" field based on the provided vaultData context. You do not need to return actions for read-only queries.

If the user asks to add or update data, emit the corresponding action(s) in the "actions" array.
Allowed action types and their data schemas:
1. "add_note": { "title": string, "description": string, "tags": string[], "categories": string[] }
2. "add_person": { "name": string, "organisation": string, "designation": string, "contact_info": string, "notes": string }
3. "add_company": { "name": string, "industry": string, "website": string, "description": string }
4. "add_project": { "name": string, "status": "planning"|"active"|"completed"|"paused", "description": string }
5. "add_technology": { "name": string, "description": string }

To UPDATE an existing item, use the "update_..." prefix and INCLUDE the "id" field:
6. "update_note": { "id": string, ...other_fields_to_update }
7. "update_person": { "id": string, ...other_fields_to_update }
8. "update_company": { "id": string, ...other_fields_to_update }
9. "update_project": { "id": string, ...other_fields_to_update }
10. "update_technology": { "id": string, ...other_fields_to_update }

If the user gives a linkedin ID/URL or visiting card image, extract the details and create add_person/add_company actions.`

    const parts = []
    
    if (vaultData) {
      parts.push({ text: "Current Vault Data context: " + JSON.stringify(vaultData) })
    }
    
    if (message) {
      parts.push({ text: "User Input: " + message })
    }
    if (image) {
      // Assuming jpeg if base64 provided
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image
        }
      })
    }

    if (!message && !image) {
      throw new Error('No message or image provided')
    }

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{
        parts: parts
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to fetch from Gemini API')
    }

    const responseData = await response.json()
    const resultText = responseData.candidates[0].content.parts[0].text
    
    // Validate JSON parsing
    let parsedResult
    try {
      parsedResult = JSON.parse(resultText)
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', resultText)
      throw new Error('Invalid JSON format returned from Gemini')
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge function error:', error.message)
    // Return 200 so the Supabase client doesn't throw a generic HTTP error,
    // allowing the frontend to read the specific `error.message` from the JSON.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
