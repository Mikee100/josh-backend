import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IMAGES_DB_PATH = join(__dirname, '../data/images.json');

/**
 * Fix image categories based on which array they're in
 * Also tries to detect category from Cloudinary URL path
 */
async function fixImageCategories() {
  console.log('🔧 Starting category fix...\n');

  try {
    // Read existing database
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const imagesDb = JSON.parse(data);

    console.log('📂 Current database:');
    console.log(`   - Josh: ${imagesDb.josh?.length || 0} images`);
    console.log(`   - Family: ${imagesDb.family?.length || 0} images`);
    console.log(`   - Friends: ${imagesDb.friends?.length || 0} images\n`);

    const categories = ['josh', 'family', 'friends'];
    let fixedCount = 0;

    // Fix each category
    for (const category of categories) {
      if (!imagesDb[category] || !Array.isArray(imagesDb[category])) {
        imagesDb[category] = [];
        continue;
      }

      console.log(`🔍 Fixing ${category} category (${imagesDb[category].length} images)...`);
      
      imagesDb[category] = imagesDb[category].map((image, index) => {
        let imageCategory = image.category;

        // If category is missing or wrong, try to detect from URL
        if (!imageCategory || !categories.includes(imageCategory)) {
          const url = image.url || image.publicId || '';
          
          // Try to detect from URL path
          if (url.includes('/josh-farewell/josh/') || url.includes('/josh/')) {
            imageCategory = 'josh';
          } else if (url.includes('/josh-farewell/friends/') || url.includes('/friends/')) {
            imageCategory = 'friends';
          } else if (url.includes('/josh-farewell/family/') || url.includes('/family/')) {
            imageCategory = 'family';
          } else {
            // Use the array category as fallback
            imageCategory = category;
          }
        }

        // If category still doesn't match the array, fix it
        if (imageCategory !== category) {
          fixedCount++;
          console.log(`   ⚠️  Image ${index + 1}: category "${image.category}" -> "${category}" (from array)`);
        }

        return {
          ...image,
          category: category // Always use the array category as the source of truth
        };
      });

      console.log(`   ✅ Fixed ${category} category\n`);
    }

    // Save fixed database
    await writeFile(IMAGES_DB_PATH, JSON.stringify(imagesDb, null, 2));

    console.log('✅ Category fix complete!');
    console.log(`📊 Final database stats:`);
    console.log(`   - Josh: ${imagesDb.josh.length} images`);
    console.log(`   - Family: ${imagesDb.family.length} images`);
    console.log(`   - Friends: ${imagesDb.friends.length} images`);
    console.log(`   - Total: ${imagesDb.josh.length + imagesDb.family.length + imagesDb.friends.length} images`);
    console.log(`   - Fixed ${fixedCount} category mismatches`);
  } catch (error) {
    console.error('❌ Error fixing categories:', error);
    process.exit(1);
  }
}

// Run the fix
fixImageCategories();
