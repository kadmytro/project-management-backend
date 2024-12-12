export enum SubmissionType {
  FILE_UPLOAD = "file_upload",
  SIMPLE_MARK = "simple_mark",
}

export const isValidSubmissionType = (type: any): boolean => {
  return Object.values(SubmissionType).includes(type as SubmissionType);
}