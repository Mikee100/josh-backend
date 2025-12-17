import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const IMAGES_DB_PATH = join(__dirname, '../data/images.json');

/**
 * Fetch all resources from a Cloudinary folder
 */
async function fetchCloudinaryResources(folderPath) {
  try {
    // Use the resources API instead of search API
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500
    });

    return result.resources || [];
  } catch (error) {
    console.error(`Error fetching resources from ${folderPath}:`, error);
    console.error(`Error details:`, error.message || error);
    return [];
  }
}

/**
 * Convert Cloudinary resource to our image format
 */
function cloudinaryResourceToImage(resource, category) {
  return {
    id: resource.public_id?.replace(/\//g, '_') + '_' + (resource.created_at || Date.now()) || Date.now().toString(),
    url: resource.secure_url,
    publicId: resource.public_id,
    category: category,
    caption: '',
    uploadedAt: resource.created_at ? new Date(resource.created_at).toISOString() : new Date().toISOString(),
    width: resource.width,
    height: resource.height,
    format: resource.format,
    resourceType: resource.resource_type || 'image'
  };
}

/**
 * Sync images from Cloudinary folders to the database
 */
async function syncCloudinaryToDatabase() {
  console.log('🔄 Starting Cloudinary sync...\n');

  // Test Cloudinary connection first
  try {
    const testResult = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful\n');
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    console.error('Please check your .env file has CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    return;
  }

  const categories = ['josh', 'family', 'friends'];
  const imagesDb = { josh: [], family: [], friends: [] };

  // Try to preserve existing database (but we'll overwrite with Cloudinary data)
  let existingData = null;
  try {
    const existingFile = await readFile(IMAGES_DB_PATH, 'utf-8');
    existingData = JSON.parse(existingFile);
    console.log('📂 Found existing database with:');
    console.log(`   - Josh: ${existingData.josh?.length || 0} images`);
    console.log(`   - Family: ${existingData.family?.length || 0} images`);
    console.log(`   - Friends: ${existingData.friends?.length || 0} images\n`);
  } catch (error) {
    console.log('📂 No existing database found, creating new one\n');
  }

  // Fetch all images from each Cloudinary folder
  for (const category of categories) {
    const folderPath = `josh-farewell/${category}`;
    console.log(`📁 Fetching images from Cloudinary folder: ${folderPath}...`);
    
    const resources = await fetchCloudinaryResources(folderPath);
    console.log(`   Found ${resources.length} resources from Cloudinary`);

    if (resources.length > 0) {
      // Convert Cloudinary resources to our format
      const images = resources.map(resource => 
        cloudinaryResourceToImage(resource, category)
      );

      imagesDb[category] = images;
      console.log(`   ✅ Synced ${images.length} images from Cloudinary to ${category} category\n`);
    } else {
      // If Cloudinary fetch failed, use existing data
      if (existingData && existingData[category] && existingData[category].length > 0) {
        console.log(`   ⚠️  Cloudinary fetch failed, using existing ${existingData[category].length} images from database for ${category}`);
        // Fix category property in existing data if needed
        imagesDb[category] = existingData[category].map(img => ({
          ...img,
          category: category // Ensure category is correct
        }));
      } else {
        console.log(`   ⚠️  No images found for ${category} (neither Cloudinary nor existing data)\n`);
        imagesDb[category] = [];
      }
    }
  }

  // Save to database
  await writeFile(IMAGES_DB_PATH, JSON.stringify(imagesDb, null, 2));

  console.log('✅ Sync complete!');
  console.log(`📊 Final database stats:`);
  console.log(`   - Josh: ${imagesDb.josh.length} images`);
  console.log(`   - Family: ${imagesDb.family.length} images`);
  console.log(`   - Friends: ${imagesDb.friends.length} images`);
  console.log(`   - Total: ${imagesDb.josh.length + imagesDb.family.length + imagesDb.friends.length} images`);
}

// Run the sync
syncCloudinaryToDatabase().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
