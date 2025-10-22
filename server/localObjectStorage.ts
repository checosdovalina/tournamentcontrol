import { Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Local filesystem-based object storage for VPS deployment
// Stores uploaded files in public/uploads/advertisements directory

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "advertisements");

export class LocalObjectStorageService {
  constructor() {
    this.ensureUploadsDirectory();
  }

  // Ensure uploads directory exists
  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating uploads directory:", error);
    }
  }

  // Save uploaded file and return its public URL
  async saveUploadedFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<string> {
    // Generate unique filename
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    // Save file to disk
    await fs.writeFile(filePath, fileBuffer);

    // Return public URL path
    return `/uploads/advertisements/${uniqueFilename}`;
  }

  // Get file from local storage
  async getFile(relativePath: string): Promise<Buffer | null> {
    try {
      // Remove leading slash and /objects/ prefix if present
      let cleanPath = relativePath.replace(/^\/objects\//, "").replace(/^\//, "");
      
      // If path starts with uploads/advertisements, use it directly
      // Otherwise prepend it
      if (!cleanPath.startsWith("uploads/advertisements/")) {
        cleanPath = `uploads/advertisements/${cleanPath}`;
      }

      const filePath = path.join(process.cwd(), "public", cleanPath);
      const fileBuffer = await fs.readFile(filePath);
      return fileBuffer;
    } catch (error) {
      return null;
    }
  }

  // Download file to response
  async downloadFile(relativePath: string, res: Response): Promise<boolean> {
    try {
      const fileBuffer = await this.getFile(relativePath);
      
      if (!fileBuffer) {
        return false;
      }

      // Determine content type from file extension
      const ext = path.extname(relativePath).toLowerCase();
      const contentType = this.getContentType(ext);

      res.set({
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length,
        "Cache-Control": "public, max-age=3600",
      });

      res.send(fileBuffer);
      return true;
    } catch (error) {
      console.error("Error downloading file:", error);
      return false;
    }
  }

  // Normalize path from GCS URL to local path
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already a local path, return as-is
    if (rawPath.startsWith("/uploads/") || rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // If it's a Google Cloud Storage URL, we can't convert it
    // Return as-is (for existing data compatibility)
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    return rawPath;
  }

  // No-op for ACL policy (local filesystem doesn't need ACL)
  async trySetObjectEntityAclPolicy(rawPath: string): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  // Get content type from file extension
  private getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".pdf": "application/pdf",
    };
    return contentTypes[ext] || "application/octet-stream";
  }

  // Validate file type
  isValidFileType(mimeType: string): boolean {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
    ];
    return allowedTypes.includes(mimeType);
  }

  // Validate file size (max 50MB)
  isValidFileSize(sizeInBytes: number): boolean {
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    return sizeInBytes <= maxSizeInBytes;
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}
