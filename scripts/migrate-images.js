import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const PROJECT_ROOT = join(__dirname, '../..');
const IMAGES_DB_PATH = join(__dirname, '../data/images.json');

// Image directories mapping
const imageDirs = {
  josh: join(PROJECT_ROOT, 'josh_images'),
  family: join(PROJECT_ROOT, 'family_images'),
  friends: join(PROJECT_ROOT, 'friends_images')
};

// Captions mapping (you can customize these)
const captions = {
  josh: [
    'Josh smiling warmly during a quiet moment at home.',
    'A candid photo capturing Josh\'s playful side.',
    'Josh enjoying time outdoors, full of life.',
    'A quiet reflective moment that shows Josh\'s gentle spirit.',
    'Josh sharing a laugh, the way we remember him best.',
    'A treasured portrait of Josh we will always hold close.'
  ],
  family: [
    'Family gathered together, united in love for Josh.',
    'Precious early family moment with Josh.',
    'A collage of joyful family memories.',
    'Another collage capturing special family times.',
    'Family celebrations remembered with love.'
  ],
  friends: [
    'Josh surrounded by friends, sharing joy and laughter.',
    'A light-hearted moment with the friends who loved him dearly.',
    'A fun moment shared among close friends.'
  ]
};

async function uploadImage(filePath, category, caption = '') {
  try {
    console.log(`Uploading: ${filePath}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `josh-farewell/${category}`,
      resource_type: 'auto'
    });

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url: result.secure_url,
      publicId: result.public_id,
      category: category,
      caption: caption,
      uploadedAt: new Date().toISOString(),
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    return null;
  }
}

async function migrateCategory(category) {
  const dirPath = imageDirs[category];
  const images = [];
  
  try {
    const files = await readdir(dirPath);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi)$/i.test(file)
    );

    console.log(`\n📁 Found ${imageFiles.length} files in ${category} category`);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const filePath = join(dirPath, file);
      const caption = captions[category]?.[i] || '';
      
      const imageData = await uploadImage(filePath, category, caption);
      if (imageData) {
        images.push(imageData);
        console.log(`✅ Uploaded ${i + 1}/${imageFiles.length}: ${file}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return images;
}

async function main() {
  console.log('🚀 Starting image migration to Cloudinary...\n');

  // Read or create images database
  let imagesDb = { josh: [], family: [], friends: [] };
  try {
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    imagesDb = JSON.parse(data);
  } catch (error) {
    console.log('Creating new images database...');
  }

  // Migrate each category
  for (const category of ['josh', 'family', 'friends']) {
    const images = await migrateCategory(category);
    imagesDb[category] = [...imagesDb[category], ...images];
  }

  // Save to database
  await writeFile(IMAGES_DB_PATH, JSON.stringify(imagesDb, null, 2));

  console.log('\n✅ Migration complete!');
  console.log(`📊 Total images migrated:`);
  console.log(`   - Josh: ${imagesDb.josh.length}`);
  console.log(`   - Family: ${imagesDb.family.length}`);
  console.log(`   - Friends: ${imagesDb.friends.length}`);
}

main().catch(console.error);
