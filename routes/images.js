import express from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

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
    // Check if file exists
    if (!existsSync(IMAGES_DB_PATH)) {
      console.log('Images DB file not found at:', IMAGES_DB_PATH);
      // Return empty structure if file doesn't exist
      return res.json({ josh: [], family: [], friends: [] });
    }
    
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const images = JSON.parse(data);
    console.log('Successfully read images:', {
      josh: images.josh?.length || 0,
      family: images.family?.length || 0,
      friends: images.friends?.length || 0
    });
    res.json(images);
  } catch (error) {
    console.error('Error reading images:', error);
    console.error('Error details:', {
      code: error.code,
      path: IMAGES_DB_PATH,
      message: error.message
    });
    // Return empty structure on error instead of 500
    res.json({ josh: [], family: [], friends: [] });
  }
});

/**
 * GET /api/images/:category
 * Get images by category (josh, family, friends)
 */
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Check if file exists
    if (!existsSync(IMAGES_DB_PATH)) {
      return res.json([]);
    }
    
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const images = JSON.parse(data);
    
    if (images[category]) {
      res.json(images[category]);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading images:', error);
    res.json([]);
  }
});

export default router;
