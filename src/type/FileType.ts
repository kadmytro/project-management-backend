export enum FileType {
  FILE = "file",
  FOLDER = "folder",
}

export const isValidFileType = (type: any): boolean => {
  return Object.values(FileType).includes(type);
};

export enum StorageType {
  LOCAL = "local",
  CLOUD = "cloud",
}

export const isValidStorageType = (type: any): boolean => {
  return Object.values(StorageType).includes(type);
};
