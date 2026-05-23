/** Max size for academic files (Vercel Blob client uploads support large files). */
export const MAX_ACADEMIC_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/** Vercel serverless request body limit — use direct Blob client above this. */
export const VERCEL_SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MB (safe under 4.5 MB limit)

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function blobSetupHint(): string {
  return 'Connect Vercel Blob: Vercel project → Storage → Create Blob Store, then redeploy.';
}

export function isAcademicUploadFolder(folder: string): boolean {
  return (
    folder === 'subject-content' ||
    folder === 'academic' ||
    folder.startsWith('subject')
  );
}
