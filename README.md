# Josh Farewell Backend API

Backend server for the Josh Farewell memorial website with cloud image storage.

## Features

- ✅ RESTful API for serving images
- ✅ Cloudinary integration for cloud image storage
- ✅ Image upload endpoint
- ✅ Image deletion endpoint
- ✅ CORS enabled for frontend access
- ✅ Ready for deployment on Render

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Cloudinary

1. Sign up for a free account at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from the [Cloudinary Console](https://cloudinary.com/console)
3. Create a `.env` file in the `server` directory:

```env
PORT=3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Get All Images
```
GET /api/images
```

Returns all images grouped by category:
```json
{
  "josh": [...],
  "family": [...],
  "friends": [...]
}
```

### Get Images by Category
```
GET /api/images/:category
```

Where `category` is one of: `josh`, `family`, or `friends`

### Upload Image
```
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: (image/video file)
- category: "josh" | "family" | "friends"
- caption: (optional) string
```

### Delete Image
```
DELETE /api/upload/:id
```

## Deployment on Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Set build command: `cd server && npm install`
5. Set start command: `cd server && npm start`
6. Add environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `PORT` (Render will set this automatically)

## Alternative Storage Options

If you prefer not to use Cloudinary, you can modify `server/routes/upload.js` to use:

- **AWS S3** - Most popular, requires AWS account
- **Supabase Storage** - Free tier, easy setup
- **Firebase Storage** - Google's solution, free tier
- **Render Static Storage** - If available

## Migrating Existing Images

To migrate your existing local images to Cloudinary:

1. Use the upload endpoint to upload each image
2. Or create a migration script (see `scripts/migrate-images.js`)
