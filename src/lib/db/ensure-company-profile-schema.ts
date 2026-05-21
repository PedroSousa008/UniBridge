import { prisma } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureCompanyProfileSchema() {
  if (!ensurePromise) {
    ensurePromise = prisma
      .$executeRaw`ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT`
      .then(() => undefined)
      .catch((e) => {
        console.error('[ensure-company-profile-schema]', e);
        ensurePromise = null;
      });
  }
  await ensurePromise;
}
