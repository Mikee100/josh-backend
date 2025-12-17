import express from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the images metadata file
const IMAGES_DB_PATH = join(__dirname, '../data/images.json');

/**
 * GET /api/images
 * Get all images grouped by category
 */
router.get('/', async (req, res) => {
  try {
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const images = JSON.parse(data);
    res.json(images);
  } catch (error) {
    console.error('Error reading images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

/**
 * GET /api/images/:category
 * Get images by category (josh, family, friends)
 */
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const images = JSON.parse(data);
    
    if (images[category]) {
      res.json(images[category]);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    console.error('Error reading images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

export default router;
