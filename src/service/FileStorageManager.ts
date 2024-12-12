import { StorageType } from "../type/FileType";
import { StorageService } from "../type/StorageService";
import { LocalStorageService } from "./localStorageService";

export class FileStorageManager {
  private storageService: StorageService;
  private localStoragePath = process.env.LOCAL_STORAGE_PATH || "/uploads";

  constructor(storageType: StorageType) {
    if (storageType === StorageType.CLOUD) {
      throw new Error("Cloud storage not implemented yet.");
    }
    this.storageService = new LocalStorageService(this.localStoragePath);
    //TODO - Implement cloud storage service
  }

  async uploadFile(buffer: Buffer, filePath: string): Promise<string> {
    return this.storageService.uploadFile(buffer, filePath);
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    return this.storageService.downloadFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.storageService.deleteFile(filePath);
  }
}
