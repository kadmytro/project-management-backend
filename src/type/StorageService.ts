export interface StorageService {
  uploadFile(buffer: Buffer, filePath: string): Promise<string>; // Returns file URL or path
  downloadFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}
