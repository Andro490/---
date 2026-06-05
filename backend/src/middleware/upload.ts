import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File | any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|avi|mkv|mov|xls|xlsx|csv|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  // Also check mimetype for excel since it can vary
  const isExcel = file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml');
  const mimetype = allowedTypes.test(file.mimetype) || isExcel;

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type! Allowed: images, videos, Excel, or PDF files.'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
  fileFilter
});
