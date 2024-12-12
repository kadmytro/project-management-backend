import fs from 'fs/promises';
import path from 'path';
import { StorageService } from '../type/StorageService';

export class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async uploadFile(buffer: Buffer, filePath: string): Promise<string> {
    const absolutePath = path.join(this.basePath, filePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
    return filePath; // Return relative path
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const absolutePath = path.join(this.basePath, filePath);
    return fs.readFile(absolutePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    const absolutePath = path.join(this.basePath, filePath);
    await fs.unlink(absolutePath);
  }
}
