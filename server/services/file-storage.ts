import multer from "multer";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const fileExtension = path.extname(file.originalname);
      const randomName = `${randomBytes(16).toString('hex')}${fileExtension}`;
      cb(null, randomName);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function handleFileUpload(file: Express.Multer.File) {
  try {
    const fileUrl = `/uploads/${file.filename}`;

    return {
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
    };
  } catch (error) {
    console.error('Error handling file upload:', error);
    throw new Error('Failed to handle file upload');
  }
}