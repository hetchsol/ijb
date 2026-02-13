# IJB Innovative Ventures - Digital Marketplace

A pay-per-download digital marketplace platform where content creators can upload and sell their work. Each download costs ZMW 2, with creators earning 85% and the platform retaining 15%.

## Platform Colors
- Gold: #F2C464
- Sky Blue: #87CEEB
- Purple: #6C5CE7

## Quick Start

The platform is already set up and running on **http://localhost:5000**

## Access Points

### Main Site (Users)
- **URL**: http://localhost:5000
- Browse and purchase digital content
- No account required to buy
- Pay via MTN Momo, Airtel Money, Zamtel, or Visa

### Creator Portal
- Click "Creator Login" on the main site
- Login or register as a creator
- Upload content and track earnings

### Admin Dashboard
- Click "Admin" on the main site
- Manage creators, content, and view platform statistics

## Sample Accounts

### Creators (Password: password123)
1. **Danny Kaya** - Music
   - Username: `dannymusic`

2. **Chilel Mwale** - Art
   - Username: `chilelart`

3. **Namwali Serpell** - Books
   - Username: `namwaliwriter`

4. **Mutale Chashi** - Videos
   - Username: `mutalefilm`

### Admin (Site Owner)
- Username: `clarence`
- Password: `clarence123`

## Sample Content

The platform includes 12 sample items across all categories:
- **Music**: Summer Vibes, Epic Orchestral Theme
- **Books**: Digital Revolution eBook, Cooking Made Easy
- **Art**: Abstract Mountains, Portrait Collection
- **Videos**: JavaScript Tutorial, Zambia Adventure
- **Documents**: Business Plan Template, Resume Templates
- **Other**: Meditation Sounds, Nature Photos

## Features

### For Users
- Browse content by category
- Search functionality
- Multiple payment methods (MTN Momo, Airtel Money, Zamtel, Visa)
- ZMW 2 per download
- Instant download after payment

### For Creators
- Easy registration and login
- Upload content (up to 100MB)
- Track earnings and downloads
- 85% revenue share (ZMW 1.70 per download)
- Creator dashboard with analytics

### For Admin (Clarence Simwanza)
- View platform statistics
- Manage all creators
- Manage all content
- View transaction history
- Delete creators or content

## Revenue Model
- Download Price: **ZMW 2.00**
- Platform Fee: **15%** (ZMW 0.30)
- Creator Earnings: **85%** (ZMW 1.70)

## Testing Payments

For development/testing, use the "Simulate Payment Success" button that appears after initiating a payment. This allows you to test the full download flow without actual payment processing.

## Tech Stack
- Backend: Node.js, Express.js
- Database: SQLite3
- Authentication: JWT, bcrypt
- File Upload: Multer
- Frontend: Vanilla JavaScript, HTML5, CSS3

## File Support
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, DOC, DOCX, TXT, EPUB, MOBI
- Audio: MP3, WAV
- Video: MP4, AVI, MOV
- Archives: ZIP, RAR
- Max file size: 100MB

## Managing the Platform

### Start Server
```bash
npm start
```

### Stop Server
Press Ctrl+C in the terminal

### Add More Sample Data
```bash
node seed-data.js
```

### Reset Database
```bash
npm run init-db
node seed-data.js
```

## Important Files
- `server.js` - Main server file
- `routes/creator.js` - Creator authentication and profile
- `routes/content.js` - Content upload and management
- `routes/payment.js` - Payment processing and downloads
- `routes/admin.js` - Admin functions
- `public/index.html` - Main site
- `public/dashboard.html` - Creator dashboard
- `public/admin.html` - Admin dashboard

## Notes
- All creator accounts use password: `password123`
- Admin account (Clarence Simwanza) uses password: `clarence123`
- Sample files are text files for demonstration
- In production, integrate real payment gateways

---

**Empowering creators, one download at a time.**

© 2024 IJB Innovative Ventures
