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
 * Reorganizes images by their category property to ensure correct categorization
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
    
    // Reorganize images by their category property
    // This fixes cases where images are in the wrong array
    const reorganized = {
      josh: [],
      family: [],
      friends: []
    };
    
    // Process each category array
    ['josh', 'family', 'friends'].forEach(arrayCategory => {
      if (images[arrayCategory] && Array.isArray(images[arrayCategory])) {
        images[arrayCategory].forEach(image => {
          // Use the image's category property, or fall back to array category
          let imageCategory = image.category;
          
          // If category is missing or invalid, try to detect from URL
          if (!imageCategory || !['josh', 'family', 'friends'].includes(imageCategory)) {
            const url = image.url || image.publicId || '';
            if (url.includes('/josh-farewell/josh/') || url.includes('/josh/')) {
              imageCategory = 'josh';
            } else if (url.includes('/josh-farewell/friends/') || url.includes('/friends/')) {
              imageCategory = 'friends';
            } else if (url.includes('/josh-farewell/family/') || url.includes('/family/')) {
              imageCategory = 'family';
            } else {
              imageCategory = arrayCategory; // Fallback to array category
            }
          }
          
          // Ensure category is valid
          if (!['josh', 'family', 'friends'].includes(imageCategory)) {
            imageCategory = arrayCategory;
          }
          
          // Add image to correct category with corrected category property
          reorganized[imageCategory].push({
            ...image,
            category: imageCategory
          });
        });
      }
    });
    
    console.log('Successfully read and reorganized images:', {
      josh: reorganized.josh.length,
      family: reorganized.family.length,
      friends: reorganized.friends.length
    });
    
    res.json(reorganized);
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
