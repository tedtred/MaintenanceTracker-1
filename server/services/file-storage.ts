import multer from "multer";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { Asset, AssetCategory, AssetStatus, insertAssetSchema, MaintenanceSchedule, insertMaintenanceScheduleSchema, MaintenanceFrequency, MaintenanceStatus } from "@shared/schema";

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
    // Only allow CSV files for import
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
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
  importedAssets: Array<Omit<Asset, 'id'>>;
  importedSchedules: Array<Omit<MaintenanceSchedule, 'id' | 'assetId'>>;
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
    importedAssets: [],
    importedSchedules: []
  };

  return new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

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
          const validatedAsset = insertAssetSchema.parse(assetData);
          result.importedAssets.push(validatedAsset);

          // Parse maintenance schedules if present
          if (record.maintenanceSchedules) {
            try {
              const schedules = JSON.parse(record.maintenanceSchedules);
              if (Array.isArray(schedules)) {
                for (const schedule of schedules) {
                  const scheduleData = {
                    title: schedule.title,
                    description: schedule.description || '',
                    status: schedule.status || MaintenanceStatus.SCHEDULED,
                    frequency: schedule.frequency || MaintenanceFrequency.MONTHLY,
                    startDate: new Date(schedule.startDate),
                    endDate: schedule.endDate ? new Date(schedule.endDate) : null,
                    lastCompleted: schedule.lastCompleted ? new Date(schedule.lastCompleted) : null
                  };

                  const validatedSchedule = insertMaintenanceScheduleSchema.omit({ assetId: true }).parse(scheduleData);
                  result.importedSchedules.push(validatedSchedule);
                }
              }
            } catch (error) {
              console.warn(`Failed to parse maintenance schedules for asset: ${record.name}`, error);
            }
          }

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

export function generateCSVExport(assets: Asset[], schedules: MaintenanceSchedule[]): string {
  // Create a map of asset IDs to their maintenance schedules
  const assetSchedules = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.assetId]) {
      acc[schedule.assetId] = [];
    }
    acc[schedule.assetId].push({
      title: schedule.title,
      description: schedule.description,
      status: schedule.status,
      frequency: schedule.frequency,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate?.toISOString() || null,
      lastCompleted: schedule.lastCompleted?.toISOString() || null
    });
    return acc;
  }, {} as Record<number, Array<Omit<MaintenanceSchedule, 'id' | 'assetId'>>>);

  // Prepare data for CSV export
  const exportData = assets.map(asset => ({
    name: asset.name,
    description: asset.description,
    location: asset.location,
    status: asset.status,
    category: asset.category,
    manufacturer: asset.manufacturer,
    modelNumber: asset.modelNumber,
    serialNumber: asset.serialNumber,
    commissionedDate: asset.commissionedDate?.toISOString(),
    lastMaintenance: asset.lastMaintenance?.toISOString(),
    maintenanceSchedules: JSON.stringify(assetSchedules[asset.id] || [])
  }));

  // Generate CSV string
  return stringify(exportData, {
    header: true,
    columns: [
      'name',
      'description',
      'location',
      'status',
      'category',
      'manufacturer',
      'modelNumber',
      'serialNumber',
      'commissionedDate',
      'lastMaintenance',
      'maintenanceSchedules'
    ]
  });
}