import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DB_PATH = join(__dirname, '../data/images.json');

// Lazy Cloudinary configuration - only configure when needed
let cloudinaryConfigured = false;

function configureCloudinary() {
  if (cloudinaryConfigured) return true;
  
  // Get and validate Cloudinary credentials
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  // Check if credentials are valid
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('⚠️  Cloudinary credentials missing or empty:');
    console.error('   CLOUDINARY_CLOUD_NAME:', cloudName || 'MISSING');
    console.error('   CLOUDINARY_API_KEY:', apiKey ? '***' + apiKey.slice(-4) : 'MISSING');
    console.error('   CLOUDINARY_API_SECRET:', apiSecret ? '***' + apiSecret.slice(-4) : 'MISSING');
    return false;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });

  // Debug: Show masked credentials for verification
  console.log('✅ Cloudinary credentials loaded successfully');
  console.log('   Cloud Name:', cloudName);
  console.log('   API Key:', apiKey ? '***' + apiKey.slice(-4) : 'MISSING');
  console.log('   API Secret:', apiSecret ? '***' + apiSecret.slice(-4) : 'MISSING');
  console.log('   ⚠️  If upload fails, verify these match your Cloudinary dashboard');
  cloudinaryConfigured = true;
  return true;
}

// Configure multer for file uploads (temporary storage before Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (increased for large images/videos)
  },
  fileFilter: (req, file, cb) => {
    // Allowed file extensions (including HEIC/HEIF for Apple devices)
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|bmp|svg|heic|heif|mp4|mov|avi|wmv|flv|webm|mkv)$/i;
    
    // Allowed MIME types (more lenient - accepts image/* and video/*)
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    // Special handling for HEIC/HEIF files which may have application/octet-stream MIME type
    const isHeicFile = /\.(heic|heif)$/i.test(file.originalname);
    
    // Check if file has allowed extension OR is an image/video MIME type OR is HEIC/HEIF
    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = isImage || isVideo;
    
    if (hasValidExtension || hasValidMimeType || isHeicFile) {
      return cb(null, true);
    } else {
      console.error(`Rejected file: ${file.originalname}, mimetype: ${file.mimetype}`);
      cb(new Error(`Only image and video files are allowed. Received: ${file.mimetype || 'unknown type'}`));
    }
  }
});

/**
 * POST /api/upload
 * Upload one or multiple images/videos to Cloudinary and save metadata
 * Supports both 'files' (multiple) and 'file' (single) field names
 */
router.post('/', upload.any(), async (req, res) => {
  try {
    // Configure Cloudinary (lazy initialization)
    if (!configureCloudinary()) {
      return res.status(500).json({ 
        error: 'Cloudinary is not configured. Please check your .env file.' 
      });
    }

    // Get all uploaded files (multer.any() puts all files in req.files array)
    // Filter by fieldname to support both 'files' and 'file' field names
    const files = (req.files || []).filter(file => 
      file.fieldname === 'files' || file.fieldname === 'file'
    );
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { category, captions } = req.body; // captions can be JSON array or single string
    
    if (!category || !['josh', 'family', 'friends'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be: josh, family, or friends' });
    }

    // Parse captions if provided as JSON array
    let captionArray = [];
    if (captions) {
      try {
        captionArray = JSON.parse(captions);
      } catch {
        // If not JSON, treat as single caption for all files
        captionArray = [captions];
      }
    }

    // Read current images database
    let images;
    try {
      const data = await readFile(IMAGES_DB_PATH, 'utf-8');
      images = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, create default structure
      images = { josh: [], family: [], friends: [] };
    }

    // Upload all files to Cloudinary
    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `josh-farewell/${category}`,
            resource_type: 'auto', // auto-detect image or video
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(file.buffer);
      }).then(uploadResult => {
        // Create image metadata
        const caption = captionArray[index] || '';
        return {
          id: Date.now().toString() + index,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          category: category,
          caption: caption,
          uploadedAt: new Date().toISOString(),
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          resourceType: uploadResult.resource_type
        };
      });
    });

    // Wait for all uploads to complete
    const uploadedImages = await Promise.all(uploadPromises);

    // Add all new images to database
    uploadedImages.forEach(newImage => {
      images[category].push(newImage);
    });

    // Save updated database
    await writeFile(IMAGES_DB_PATH, JSON.stringify(images, null, 2));

    res.status(201).json({
      message: `${uploadedImages.length} file(s) uploaded successfully`,
      images: uploadedImages,
      count: uploadedImages.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide helpful error messages for common issues
    let errorMessage = error.message || 'Failed to upload file';
    
    if (error.http_code === 401) {
      if (error.message?.includes('Invalid Signature')) {
        errorMessage = 'Invalid API Secret. Please check your CLOUDINARY_API_SECRET in the .env file matches your Cloudinary dashboard.';
      } else {
        errorMessage = 'Authentication failed. Please verify your Cloudinary credentials in the .env file.';
      }
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * DELETE /api/upload/:id
 * Delete an image from Cloudinary and database
 */
router.delete('/:id', async (req, res) => {
  try {
    // Configure Cloudinary (lazy initialization)
    if (!configureCloudinary()) {
      return res.status(500).json({ 
        error: 'Cloudinary is not configured. Please check your .env file.' 
      });
    }

    const { id } = req.params;

    // Read current images database
    const data = await readFile(IMAGES_DB_PATH, 'utf-8');
    const images = JSON.parse(data);

    // Find and remove image
    let found = false;
    let publicId = null;
    
    for (const category of ['josh', 'family', 'friends']) {
      const index = images[category].findIndex(img => img.id === id);
      if (index !== -1) {
        publicId = images[category][index].publicId;
        images[category].splice(index, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from Cloudinary
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    // Save updated database
    await writeFile(IMAGES_DB_PATH, JSON.stringify(images, null, 2));

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
