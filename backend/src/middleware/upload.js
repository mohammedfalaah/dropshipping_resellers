const multer = require("multer");
const path = require("path");

// Memory storage keeps file buffer in memory for instant sharp compression
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|svg|gif|avif|heic|heif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (
    allowedExtensions.test(ext) ||
    mime.startsWith("image/") ||
    mime === "image/svg+xml"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only image files (JPEG, PNG, WebP, SVG, AVIF, HEIC) are accepted."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Allows up to 15MB before compression
  fileFilter,
});

module.exports = upload;
