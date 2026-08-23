const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const replacements = [
  ['New Idea', 'New Note'],
  ['>Ideas<', '>Notes<'],
  ['Current View Ideas', 'Current View Notes'],
  ['All Ideas', 'All Notes'],
  ['e.g., Ideas, Doubts, Music Playlists', 'e.g., Notes, Doubts, Music Playlists'],
  ['Untitled Idea', 'Untitled Note'],
  ['Edit Idea', 'Edit Note'],
  ['Idea saved', 'Note saved'],
  ['Idea moved to Recycle Bin', 'Note moved to Recycle Bin'],
  ['Idea restored', 'Note restored'],
  ['Idea permanently deleted', 'Note permanently deleted'],
  ['Idea archived', 'Note archived'],
  ['Idea unarchived', 'Note unarchived'],
  ['Idea updated', 'Note updated'],
  ["singular = 'Idea';", "singular = 'Note';"],
  ['Total Ideas', 'Total Notes'],
  ['Recent Ideas', 'Recent Notes'],
  ['View all ideas', 'View all notes'],
  ["panelName: 'Ideas'", "panelName: 'Notes'"],
  ["Ideas <span", "Notes <span"]
];

for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

fs.writeFileSync('index.html', content);
console.log('Done replacements');
