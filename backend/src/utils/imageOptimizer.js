const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments (e.g., Vercel)
}

/**
 * Optimizes an uploaded image buffer:
 * - Auto-rotates orientation
 * - Resizes to max width/height (1200x1200) keeping aspect ratio
 * - Compresses and converts to modern WebP format
 * - Reduces file size by 70-95%
 *
 * @param {Buffer} buffer - Raw uploaded image buffer
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<Object>} Optimization results with URLs and compression stats
 */
const optimizeImage = async (buffer, originalName = "image.jpg") => {
  const originalSize = buffer.length;

  // Process image with sharp
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Compress & resize to WebP
  const optimizedBuffer = await image
    .rotate() // auto-orient based on EXIF
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  const compressedSize = optimizedBuffer.length;
  const savingsBytes = originalSize - compressedSize;
  const savingsPercent =
    originalSize > 0
      ? `${Math.max(0, ((savingsBytes / originalSize) * 100)).toFixed(1)}%`
      : "0%";

  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const filename = `prod-opt-${uniqueSuffix}.webp`;
  const filePath = path.join(uploadDir, filename);

  let fileUrl = `/uploads/${filename}`;
  let savedToDisk = false;

  // Attempt saving to uploads folder if filesystem allows
  try {
    fs.writeFileSync(filePath, optimizedBuffer);
    savedToDisk = true;
  } catch (err) {
    // If running in a read-only serverless environment like Vercel,
    // fallback to serving or storing as base64 data URI
    savedToDisk = false;
  }

  const base64DataUri = `data:image/webp;base64,${optimizedBuffer.toString("base64")}`;

  // On serverless read-only environments, use base64 data URI as the primary URL
  // so images render reliably without an external S3 bucket
  const primaryUrl = savedToDisk ? fileUrl : base64DataUri;

  return {
    url: primaryUrl,
    fileUrl,
    dataUri: base64DataUri,
    filename,
    originalSize,
    compressedSize,
    originalSizeFormatted: formatBytes(originalSize),
    compressedSizeFormatted: formatBytes(compressedSize),
    savingsPercent,
    format: "webp",
    width: metadata.width,
    height: metadata.height,
    savedToDisk,
  };
};

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

module.exports = {
  optimizeImage,
  formatBytes,
};
