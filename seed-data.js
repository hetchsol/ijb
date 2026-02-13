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

async function seedData() {
  await connectDB();
  console.log('Seeding sample data...');

  const password = await bcrypt.hash('password123', 10);

  const creators = [
    { username: 'dannymusic', email: 'danny@example.com', displayName: 'Danny Kaya', bio: 'Zambian music producer and artist' },
    { username: 'chilelart', email: 'chilel@example.com', displayName: 'Chilel Mwale', bio: 'Visual artist and illustrator' },
    { username: 'namwaliwriter', email: 'namwali2@example.com', displayName: 'Namwali Serpell', bio: 'Award-winning Zambian author' },
    { username: 'mutalefilm', email: 'mutale@example.com', displayName: 'Mutale Chashi', bio: 'Filmmaker and content creator' },
  ];

  const creatorDocs = [];
  for (const c of creators) {
    const existing = await Creator.findOne({ username: c.username });
    if (existing) {
      creatorDocs.push(existing);
      console.log(`Creator ${c.username} already exists`);
    } else {
      const doc = await Creator.create({ ...c, passwordHash: password });
      creatorDocs.push(doc);
      console.log(`Created creator: ${c.username}`);
    }
  }

  const sampleContent = [
    { title: 'Summer Vibes - Chill Beat', description: 'A relaxing instrumental track perfect for summer days', category: 'Music', creatorIdx: 0, filename: 'summer-vibes.txt', content: 'Sample music file.' },
    { title: 'Epic Orchestral Theme', description: 'Powerful orchestral music for dramatic moments', category: 'Music', creatorIdx: 0, filename: 'epic-orchestral.txt', content: 'Sample music file.' },
    { title: 'The Digital Revolution - eBook', description: 'A comprehensive guide to understanding the digital age', category: 'Books', creatorIdx: 2, filename: 'digital-revolution.txt', content: 'Sample book file.\n\nChapter 1: Introduction\nThe digital revolution has transformed every aspect of our lives...' },
    { title: 'Cooking Made Easy - Recipe Collection', description: '50 simple recipes for busy people', category: 'Books', creatorIdx: 2, filename: 'cooking-easy.txt', content: 'Sample recipe book.\n\nRecipe 1: Quick Pasta...' },
    { title: 'Abstract Mountains - Digital Art', description: 'Beautiful abstract interpretation of mountain landscapes', category: 'Art', creatorIdx: 1, filename: 'abstract-mountains.txt', content: 'Sample art file.' },
    { title: 'Portrait Collection - 10 Images', description: 'A collection of digital portrait artwork', category: 'Art', creatorIdx: 1, filename: 'portrait-collection.txt', content: 'Sample art collection.' },
    { title: 'Coding Tutorial - JavaScript Basics', description: '30-minute video tutorial on JavaScript fundamentals', category: 'Videos', creatorIdx: 3, filename: 'js-basics.txt', content: 'Sample video file.' },
    { title: 'Travel Vlog - Zambia Adventure', description: 'A 20-minute travel vlog exploring beautiful Zambia', category: 'Videos', creatorIdx: 3, filename: 'zambia-adventure.txt', content: 'Sample video file.' },
    { title: 'Business Plan Template', description: 'Professional business plan template with examples', category: 'Documents', creatorIdx: 2, filename: 'business-plan.txt', content: 'Sample document.\n\nBUSINESS PLAN TEMPLATE\n\n1. Executive Summary...' },
    { title: 'Resume Templates - 5 Designs', description: 'Modern resume templates ready to customize', category: 'Documents', creatorIdx: 1, filename: 'resume-templates.txt', content: 'Sample document package.' },
    { title: 'Meditation Sound Pack', description: 'Collection of meditation and relaxation sounds', category: 'Other', creatorIdx: 0, filename: 'meditation-sounds.txt', content: 'Sample audio package.' },
    { title: 'Stock Photos - Nature Pack', description: '25 high-quality nature photographs', category: 'Other', creatorIdx: 1, filename: 'nature-photos.txt', content: 'Sample photo package.' },
  ];

  for (const item of sampleContent) {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + item.filename;
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
      priceZmw: Math.floor(Math.random() * 5) + 1
    });
    console.log(`Added content: ${item.title}`);
  }

  // Create admin
  const adminUsername = process.env.ADMIN_USERNAME || 'clarence';
  const adminPassword = process.env.ADMIN_PASSWORD || 'clarence123';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await Admin.findOneAndUpdate(
    { username: adminUsername },
    { username: adminUsername, passwordHash: adminHash },
    { upsert: true }
  );
  console.log(`Admin account created: ${adminUsername}`);

  console.log('\nSample data seeded successfully!');
  console.log('\nSample Creator Credentials:');
  creators.forEach(c => console.log(`Username: ${c.username} | Password: password123`));
  console.log(`\nAdmin: ${adminUsername} / ${adminPassword}`);

  await mongoose.connection.close();
  process.exit(0);
}

seedData().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
