const resp = fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'groq/compound-mini',
    temperature: 0,
    messages: [{ role: 'system', content: 'Say hello' }, { role: 'user', content: 'Hi' }]
  })
}).then(r => r.text()).then(console.log);
