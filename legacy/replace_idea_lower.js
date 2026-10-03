const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const replacements = [
  ['all your ideas,', 'all your notes,'],
  ["+ ' ideas'", "+ ' notes'"],
  ['No deleted ideas', 'No deleted notes'],
  ['No ideas found', 'No notes found'],
  ['create a new idea.', 'create a new note.'],
  ['ALL your ideas,', 'ALL your notes,'],
  ['No ideas yet', 'No notes yet'],
  ['Add an idea to get started.', 'Add a note to get started.'],
  ['} ideas`;', '} notes`;'],
  ["'created idea'", "'created note'"],
  ["'edited idea'", "'edited note'"],
  [".includes('idea')", ".includes('note')"]
];

for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

fs.writeFileSync('index.html', content);
console.log('Done lowercase replacements');
