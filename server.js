import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file FIRST, before any other imports that might use env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Now import other modules (they can safely use process.env)
import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import imageRoutes from './routes/images.js';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the dist folder (for production) - only if it exists
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '../admin.html'));
});

// API Routes
app.use('/api/images', imageRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve frontend for all other routes (SPA fallback) - only if dist exists
app.get('*', (req, res) => {
  const indexPath = join(__dirname, '../dist/index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      message: 'Frontend not built. Run "npm run build" in the root directory.',
      api: {
        health: '/api/health',
        images: '/api/images',
        upload: '/api/upload',
        admin: '/admin'
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📸 Image API available at http://localhost:${PORT}/api/images`);
});
