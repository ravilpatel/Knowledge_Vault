fetch('https://api.groq.com/openai/v1/models', {
  headers: {
    'Authorization': 'Bearer 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'
  }
}).then(r => r.json()).then(j => console.log(j.data.map(m => m.id)));
