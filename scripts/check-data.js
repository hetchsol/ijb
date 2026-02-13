const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking database content...\n');

db.all('SELECT id, title, category, creator_id FROM content', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} content items:\n`);
    rows.forEach(row => {
      console.log(`ID: ${row.id} | ${row.title} | Category: ${row.category} | Creator: ${row.creator_id}`);
    });
  }

  db.close();
});
