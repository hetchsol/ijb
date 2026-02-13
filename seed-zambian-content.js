require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');
const Creator = require('./models/Creator');
const Content = require('./models/Content');
const Admin = require('./models/Admin');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

async function seedZambianContent() {
  await connectDB();
  console.log('Seeding authentic Zambian content...');

  // Clear existing data
  await Promise.all([
    Creator.deleteMany({}),
    Content.deleteMany({}),
    Admin.deleteMany({})
  ]);
  console.log('Cleared existing data');

  const password = await bcrypt.hash('password123', 10);

  const creators = [
    { username: 'yomaps', email: 'yomaps@example.com', displayName: 'Yo Maps', bio: 'Award-winning Zambian musician and performer' },
    { username: 'namwali', email: 'namwali@example.com', displayName: 'Namwali Serpell', bio: 'Award-winning Zambian author' },
    { username: 'chef187', email: 'chef187@example.com', displayName: 'Chef 187', bio: 'Legendary Zambian rapper and hip-hop artist' },
    { username: 'mampi', email: 'mampi@example.com', displayName: 'Mampi', bio: 'Queen of Zambian music' },
    { username: 'dambisamoyo', email: 'dambisa@example.com', displayName: 'Dambisa Moyo', bio: 'Zambian economist and author' },
    { username: 'chile1', email: 'chile1@example.com', displayName: 'Chile One MrZambia', bio: 'Popular Zambian artist' },
  ];

  const creatorDocs = [];
  for (const c of creators) {
    const doc = await Creator.create({ ...c, passwordHash: password });
    creatorDocs.push(doc);
    console.log(`Created creator: ${c.username}`);
  }

  const zambianContent = [
    { title: 'I Wanna Eat', description: 'Hit single by Yo Maps featuring Stomebowy', category: 'Music', creatorIdx: 0, filename: 'yo-maps-i-wanna-eat.txt', content: 'Sample MP3 file - Yo Maps ft. Stomebowy - I Wanna Eat', price: 2 },
    { title: 'Occasionally', description: 'Collaboration between Umusepela Crown and Chef 187', category: 'Music', creatorIdx: 2, filename: 'occasionally.txt', content: 'Sample MP3 file - Umusepela Crown ft. Chef 187 - Occasionally', price: 2 },
    { title: 'Mulomo', description: 'Mampi featuring Chile One MrZambia', category: 'Music', creatorIdx: 3, filename: 'mampi-mulomo.txt', content: 'Sample MP3 file - Mampi ft. Chile One - Mulomo', price: 2 },
    { title: 'Fitule', description: 'Popular single by Chile One MrZambia', category: 'Music', creatorIdx: 5, filename: 'chile-fitule.txt', content: 'Sample MP3 file - Chile One MrZambia - Fitule', price: 3 },
    { title: 'True Story', description: 'Conscious music by Super Kena - Most Conscious Video winner', category: 'Music', creatorIdx: 2, filename: 'super-kena-true-story.txt', content: 'Sample MP3 file - Super Kena - True Story', price: 2 },
    { title: 'The Old Drift', description: 'Expansive, multi-generational saga that interlaces the destinies of three families over more than two centuries', category: 'Books', creatorIdx: 1, filename: 'the-old-drift.txt', content: 'Sample eBook - The Old Drift by Namwali Serpell\n\nAn award-winning novel exploring Zambian history through three families.', price: 5 },
    { title: 'Dead Aid', description: 'Economic critique arguing that international aid has inadvertently perpetuated dependency and hindered sustainable economic growth in Africa', category: 'Books', creatorIdx: 4, filename: 'dead-aid.txt', content: 'Sample eBook - Dead Aid by Dambisa Moyo\n\nA groundbreaking analysis of foreign aid in Africa.', price: 4 },
    { title: 'Zambia Shall Be Free', description: 'Autobiography where Kenneth Kaunda chronicles his remarkable journey from a youthful activist to a statesman', category: 'Books', creatorIdx: 1, filename: 'zambia-shall-be-free.txt', content: 'Sample eBook - Zambia Shall Be Free by Kenneth Kaunda', price: 3 },
    { title: 'Kumukanda', description: 'Poetry collection that bridges the personal and the political, blending lyrical beauty with sharp reflections on identity and displacement', category: 'Books', creatorIdx: 1, filename: 'kumukanda.txt', content: 'Sample eBook - Kumukanda by Kayo Chingonyi', price: 3 },
    { title: 'Patchwork', description: 'Coming-of-age narrative set in Lusaka examining identity and belonging in modern Zambia', category: 'Books', creatorIdx: 1, filename: 'patchwork.txt', content: 'Sample eBook - Patchwork by Ellen Banda-Aaku', price: 3 },
    { title: 'Shandi - Music Video', description: 'Official music video by Jay Rox featuring T Low', category: 'Videos', creatorIdx: 0, filename: 'jay-rox-shandi.txt', content: 'Sample Video - Jay Rox ft. T Low - Shandi', price: 2 },
    { title: 'Respek - Music Video', description: 'T Sean featuring Bow Chase & Reu\'ven - Official video', category: 'Videos', creatorIdx: 2, filename: 't-sean-respek.txt', content: 'Sample Video - T Sean ft. Bow Chase & Reu\'ven - Respek', price: 2 },
    { title: 'Keep Fighting', description: 'Motivational music video by 76 Drums - Best Hip-Hop Video winner', category: 'Videos', creatorIdx: 2, filename: '76-drums-keep-fighting.txt', content: 'Sample Video - 76 Drums - Keep Fighting', price: 2 },
    { title: 'Mulegeni - Music Video', description: 'Towela Kaira featuring Drifta Trek', category: 'Videos', creatorIdx: 3, filename: 'towela-mulegeni.txt', content: 'Sample Video - Towela Kaira ft. Drifta Trek - Mulegeni', price: 2 },
    { title: 'Zambian Visual Arts Collection 2024', description: 'Curated collection of contemporary Zambian visual artwork supported by Lechwe Trust', category: 'Art', creatorIdx: 1, filename: 'zambian-art-2024.txt', content: 'Sample Art Collection - Zambian Visual Arts 2024', price: 4 },
    { title: 'Zambian Music Industry Report 2024', description: 'Comprehensive analysis of the Zambian music industry, trends, and top performers', category: 'Documents', creatorIdx: 4, filename: 'zambian-music-report.txt', content: 'Sample Document - Zambian Music Industry Report 2024', price: 5 },
  ];

  for (const item of zambianContent) {
    const filename = Date.now() + '-' + Math.random().toString(36).substring(7) + '-' + item.filename;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, item.content);
    const stats = fs.statSync(filepath);

    await Content.create({
      creator: creatorDocs[item.creatorIdx]._id,
      title: item.title,
      description: item.description,
      filePath: filename,
      fileName: item.filename,
      fileSize: stats.size,
      category: item.category,
      priceZmw: item.price
    });
    console.log(`Added: ${item.title} (${item.category}) - ZMW ${item.price}`);
  }

  // Create admin
  const adminUsername = process.env.ADMIN_USERNAME || 'clarence';
  const adminPassword = process.env.ADMIN_PASSWORD || 'clarence123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await Admin.create({ username: adminUsername, passwordHash: adminHash });
  console.log(`Admin account created: ${adminUsername}`);

  console.log('\nAuthentic Zambian content seeded successfully!');
  console.log('\nSample Creator Credentials:');
  creators.forEach(c => console.log(`Username: ${c.username} | Password: password123`));
  console.log(`\nAdmin: ${adminUsername} / ${adminPassword}`);

  await mongoose.connection.close();
  process.exit(0);
}

seedZambianContent().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
