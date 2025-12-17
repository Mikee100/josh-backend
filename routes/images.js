import express from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the images metadata file
const IMAGES_DB_PATH = join(__dirname, '../data/images.json');
const DATA_DIR = join(__dirname, '../data');

// Configure Cloudinary (will use env vars if available)
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} catch (error) {
  console.warn('Cloudinary not configured:', error.message);
}

// Ensure data directory exists
async function ensureDataDirectory() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// Fetch images from Cloudinary folder
async function fetchFromCloudinary(folderPath, category) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500
    });
    
    return (result.resources || []).map(resource => ({
      id: resource.public_id?.replace(/\//g, '_') + '_' + (resource.created_at || Date.now()),
      url: resource.secure_url,
      publicId: resource.public_id,
      category: category,
      caption: '',
      uploadedAt: resource.created_at ? new Date(resource.created_at).toISOString() : new Date().toISOString(),
      width: resource.width,
      height: resource.height,
      format: resource.format,
      resourceType: resource.resource_type || 'image'
    }));
  } catch (error) {
    console.error(`Error fetching from Cloudinary ${folderPath}:`, error.message);
    return [];
  }
}

// Initialize images database - fetch from Cloudinary if empty
async function initializeImagesDatabase() {
  await ensureDataDirectory();
  
  if (!existsSync(IMAGES_DB_PATH)) {
    console.log('Database file not found, attempting to fetch from Cloudinary...');
    const imagesDb = { josh: [], family: [], friends: [] };
    
    // Try to fetch from Cloudinary
    const categories = ['josh', 'family', 'friends'];
    for (const category of categories) {
      const folderPath = `josh-farewell/${category}`;
      imagesDb[category] = await fetchFromCloudinary(folderPath, category);
      console.log(`Fetched ${imagesDb[category].length} images from Cloudinary folder: ${folderPath}`);
    }
    
    // Save to file
    await writeFile(IMAGES_DB_PATH, JSON.stringify(imagesDb, null, 2));
    console.log('Created images database from Cloudinary');
    return imagesDb;
  }
  
  // Read existing database
  const data = await readFile(IMAGES_DB_PATH, 'utf-8');
  const imagesDb = JSON.parse(data);
  
  // Check if database is empty, try to fetch from Cloudinary
  const totalImages = (imagesDb.josh?.length || 0) + (imagesDb.family?.length || 0) + (imagesDb.friends?.length || 0);
  if (totalImages === 0) {
    console.log('Database is empty, attempting to fetch from Cloudinary...');
    const categories = ['josh', 'family', 'friends'];
    for (const category of categories) {
      const folderPath = `josh-farewell/${category}`;
      imagesDb[category] = await fetchFromCloudinary(folderPath, category);
      console.log(`Fetched ${imagesDb[category].length} images from Cloudinary folder: ${folderPath}`);
    }
    
    // Save updated database
    await writeFile(IMAGES_DB_PATH, JSON.stringify(imagesDb, null, 2));
  }
  
  return imagesDb;
}

/**
 * GET /api/images
 * Get all images grouped by category
 * Fixes category property on images to match their array, but keeps images in their original arrays
 */
router.get('/', async (req, res) => {
  try {
    // Initialize database (will fetch from Cloudinary if empty or missing)
    const images = await initializeImagesDatabase();
    
    // Fix category property on images to match their array, but keep them in original arrays
    // This ensures frontend can filter correctly using the category property
    const result = {
      josh: [],
      family: [],
      friends: []
    };
    
    // Process each category array
    ['josh', 'family', 'friends'].forEach(arrayCategory => {
      if (images[arrayCategory] && Array.isArray(images[arrayCategory])) {
        result[arrayCategory] = images[arrayCategory].map(image => {
          // Ensure category property matches the array it's in
          // This is the source of truth for filtering
          return {
            ...image,
            category: arrayCategory
          };
        });
      }
    });
    
    console.log('Successfully read images:', {
      josh: result.josh.length,
      family: result.family.length,
      friends: result.friends.length
    });
    
    res.json(result);
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
    
    // Initialize database (will fetch from Cloudinary if empty or missing)
    const images = await initializeImagesDatabase();
    
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
