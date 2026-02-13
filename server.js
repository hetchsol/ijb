require('dotenv').config();

// Startup validation
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your_username')) {
  console.warn('WARNING: MONGODB_URI not configured - using in-memory MongoDB (data will not persist)');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'dev_jwt_secret_key_for_local_testing_only_change_in_production_!';
  console.warn('WARNING: Using default JWT_SECRET - set a strong one in .env for production');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./db');
const logger = require('./utils/logger');

const creatorRoutes = require('./routes/creator');
const contentRoutes = require('./routes/content');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Static files (public assets only - NOT uploads)
app.use(express.static('public'));

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/creators/login', loginLimiter);
app.use('/api/creators/register', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// API Routes
app.use('/api/creators', creatorRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/creator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'creator.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const Content = require('./models/Content');
    const Creator = require('./models/Creator');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const [contents, creators] = await Promise.all([
      Content.find().select('_id updatedAt').lean(),
      Creator.find().select('username updatedAt').lean()
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/creator</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n`;

    creators.forEach(c => {
      xml += `  <url><loc>${baseUrl}/profile/${c.username}</loc><lastmod>${c.updatedAt?.toISOString().split('T')[0] || ''}</lastmod><priority>0.6</priority></url>\n`;
    });

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  logger.info(`IJB Innovative Ventures server running on port ${PORT}`);
  logger.info(`Access the platform at http://localhost:${PORT}`);

  // Auto-seed if database is empty (useful for in-memory dev mode)
  try {
    const Content = require('./models/Content');
    const count = await Content.countDocuments();
    if (count === 0) {
      logger.info('Database is empty - auto-seeding sample data...');
      await autoSeed();
    }
  } catch (e) {
    logger.warn('Auto-seed check skipped: ' + e.message);
  }
});

async function autoSeed() {
  const bcrypt = require('bcryptjs');
  const fs = require('fs');
  const Creator = require('./models/Creator');
  const Content = require('./models/Content');
  const Admin = require('./models/Admin');

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const passwordHash = await bcrypt.hash('password123', 10);

  const creators = [
    { username: 'yomaps', email: 'yomaps@example.com', displayName: 'Yo Maps', bio: 'Award-winning Zambian musician and performer', passwordHash },
    { username: 'namwali', email: 'namwali@example.com', displayName: 'Namwali Serpell', bio: 'Award-winning Zambian author', passwordHash },
    { username: 'chef187', email: 'chef187@example.com', displayName: 'Chef 187', bio: 'Legendary Zambian rapper and hip-hop artist', passwordHash },
    { username: 'mampi', email: 'mampi@example.com', displayName: 'Mampi', bio: 'Queen of Zambian music', passwordHash },
    { username: 'dambisamoyo', email: 'dambisa@example.com', displayName: 'Dambisa Moyo', bio: 'Zambian economist and author', passwordHash },
    { username: 'chile1', email: 'chile1@example.com', displayName: 'Chile One MrZambia', bio: 'Popular Zambian artist', passwordHash },
  ];

  const creatorDocs = [];
  for (const c of creators) {
    const doc = await Creator.create(c);
    creatorDocs.push(doc);
  }

  const items = [
    { title: 'I Wanna Eat', description: 'Hit single by Yo Maps featuring Stomebowy', category: 'Music', ci: 0, price: 2 },
    { title: 'Occasionally', description: 'Collaboration between Umusepela Crown and Chef 187', category: 'Music', ci: 2, price: 2 },
    { title: 'Mulomo', description: 'Mampi featuring Chile One MrZambia', category: 'Music', ci: 3, price: 2 },
    { title: 'Fitule', description: 'Popular single by Chile One MrZambia', category: 'Music', ci: 5, price: 3 },
    { title: 'True Story', description: 'Conscious music by Super Kena', category: 'Music', ci: 2, price: 2 },
    { title: 'The Old Drift', description: 'Expansive, multi-generational saga interlacing the destinies of three families', category: 'Books', ci: 1, price: 5 },
    { title: 'Dead Aid', description: 'Economic critique on international aid in Africa', category: 'Books', ci: 4, price: 4 },
    { title: 'Zambia Shall Be Free', description: 'Kenneth Kaunda chronicles his journey from activist to statesman', category: 'Books', ci: 1, price: 3 },
    { title: 'Kumukanda', description: 'Poetry blending lyrical beauty with reflections on identity', category: 'Books', ci: 1, price: 3 },
    { title: 'Patchwork', description: 'Coming-of-age narrative set in Lusaka', category: 'Books', ci: 1, price: 3 },
    { title: 'Shandi - Music Video', description: 'Official music video by Jay Rox featuring T Low', category: 'Videos', ci: 0, price: 2 },
    { title: 'Respek - Music Video', description: 'T Sean featuring Bow Chase & Reu\'ven', category: 'Videos', ci: 2, price: 2 },
    { title: 'Keep Fighting', description: 'Motivational music video by 76 Drums', category: 'Videos', ci: 2, price: 2 },
    { title: 'Mulegeni - Music Video', description: 'Towela Kaira featuring Drifta Trek', category: 'Videos', ci: 3, price: 2 },
    { title: 'Zambian Visual Arts Collection 2024', description: 'Curated contemporary Zambian visual artwork', category: 'Art', ci: 1, price: 4 },
    { title: 'Zambian Music Industry Report 2024', description: 'Comprehensive analysis of the Zambian music industry', category: 'Documents', ci: 4, price: 5 },
  ];

  for (const item of items) {
    const fname = Date.now() + '-' + Math.random().toString(36).substring(7) + '.txt';
    const fpath = path.join(uploadsDir, fname);
    fs.writeFileSync(fpath, `Sample file: ${item.title}`);
    const stats = fs.statSync(fpath);
    await Content.create({
      creator: creatorDocs[item.ci]._id, title: item.title, description: item.description,
      filePath: fname, fileName: fname, fileSize: stats.size, category: item.category, priceZmw: item.price
    });
  }

  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'clarence123', 10);
  await Admin.create({ username: process.env.ADMIN_USERNAME || 'clarence', passwordHash: adminHash });

  const logger = require('./utils/logger');
  logger.info('Auto-seed complete: 6 creators, 16 content items, 1 admin');
}
