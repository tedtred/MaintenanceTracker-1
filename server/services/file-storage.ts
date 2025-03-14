import multer from "multer";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import { parse } from 'csv-parse';
import { Asset, AssetCategory, AssetStatus, insertAssetSchema } from "@shared/schema";

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
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types including CSV
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    error: string;
    data?: Record<string, any>;
  }>;
  importedAssets: Asset[];
}

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

export async function processCSVImport(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successfulImports: 0,
    failedImports: 0,
    errors: [],
    importedAssets: []
  };

  return new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const records: any[] = [];
    let rowNumber = 1;

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rowNumber++;
        result.totalRows++;

        try {
          // Convert CSV fields to match Asset schema
          const assetData = {
            name: record.name,
            description: record.description || '',
            location: record.location || '',
            status: record.status || AssetStatus.OPERATIONAL,
            category: record.category || AssetCategory.MACHINERY,
            manufacturer: record.manufacturer || null,
            modelNumber: record.modelNumber || null,
            serialNumber: record.serialNumber || null,
            commissionedDate: record.commissionedDate ? new Date(record.commissionedDate) : null,
            lastMaintenance: record.lastMaintenance ? new Date(record.lastMaintenance) : null
          };

          // Validate against schema
          const validatedData = insertAssetSchema.parse(assetData);
          records.push(validatedData);
          result.successfulImports++;
        } catch (error: any) {
          result.failedImports++;
          result.errors.push({
            row: rowNumber,
            error: error.message,
            data: record
          });
        }
      }
    });

    parser.on('error', (error) => {
      reject(error);
    });

    parser.on('end', () => {
      result.success = result.failedImports === 0;
      resolve(result);
    });

    // Read the file and pipe it to the parser
    fs.createReadStream(filePath).pipe(parser);
  });
}