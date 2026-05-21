'use client';

import { ImageUpload } from '@/components/ui/image-upload';
import { cn } from '@/lib/utils';

export function CompanyProfileHeroBanner({
  bannerUrl,
  canEditBanner,
  companyName,
  workspaceName,
  representativeName,
  permissionLabel,
  onBannerChange,
}: {
  bannerUrl: string | null;
  canEditBanner: boolean;
  companyName: string;
  workspaceName: string;
  representativeName: string | null;
  permissionLabel: string;
  onBannerChange: (url: string) => void;
}) {
  const hasBanner = Boolean(bannerUrl?.trim());

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl min-h-[260px] text-white',
        !hasBanner && 'bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950'
      )}
    >
      {hasBanner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bannerUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      {/* Bottom scrim so title stays readable on any banner */}
      <div
        className={cn(
          'absolute inset-0',
          hasBanner
            ? 'bg-gradient-to-t from-black/85 via-black/50 to-black/15'
            : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
        )}
      />

      {canEditBanner ? (
        <ImageUpload
          label="Company banner"
          value={bannerUrl ?? ''}
          onChange={onBannerChange}
          folder="company-banners"
          aspect="banner"
          variant="overlay"
          enableCrop
          overlayClassName="absolute top-4 right-4 z-20"
        />
      ) : null}

      <div className="relative z-10 flex min-h-[260px] flex-col justify-end px-6 pb-10 pt-14">
        <p className="text-xs uppercase tracking-[0.25em] text-white/55">Ecosystem control</p>
        <h1 className="mt-2 text-3xl font-bold drop-shadow-sm">{companyName}</h1>
        <p className="mt-2 text-sm text-white/75 max-w-2xl drop-shadow-sm">
          Identity, team access, partnerships, and security — one workspace for {workspaceName}. You are
          signed in as {representativeName ?? 'representative'} ({permissionLabel}).
        </p>
        {canEditBanner && !hasBanner ? (
          <p className="mt-3 text-xs text-white/45">
            Use <span className="text-white/70">Add banner</span> above to replace this background with your
            company image.
          </p>
        ) : null}
      </div>
    </section>
  );
}
