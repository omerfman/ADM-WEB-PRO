/**
 * ImgBB Configuration
 * Free image hosting service - https://imgbb.com/
 * 
 * HOW TO GET API KEY:
 * 1. Go to https://api.imgbb.com/
 * 2. Create a free account
 * 3. Get your API key from dashboard
 * 4. Replace 'YOUR_IMGBB_API_KEY' below with your actual key
 * 
 * FREE TIER FEATURES:
 * - Unlimited storage
 * - 32MB max file size
 * - No bandwidth limit
 * - HTTPS support
 * - Direct image links
 * 
 * NOTE: Keep this key secure. For production, use environment variables.
 */

// ImgBB API Key - Replace with your own key
export const IMGBB_API_KEY = '6e51b7a5868a7b85bfbc8de002869d1d';

// ImgBB API Endpoint
export const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// Max file size (32MB for free tier)
export const MAX_FILE_SIZE = 32 * 1024 * 1024;
