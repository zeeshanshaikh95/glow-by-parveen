import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useSettings } from '@/context/SettingsContext';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';
import { PlaceholderImage } from '@/components/PlaceholderImage';

export function GalleryPage() {
  const { data, loading, error, refetch } = useApi(
    () => publicApi.listGallery().then((r) => r.items),
    []
  );
  const { settings } = useSettings();

  return (
    <>
      <Seo
        title="Instagram Gallery"
        description="A curated selection of Glow by Parveen moments from Instagram."
        canonicalPath="/gallery"
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <p className="eyebrow">On Instagram</p>
          <h1 className="section-title mt-2">Instagram Gallery</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">
            A hand-picked selection from our Instagram — follow us for new products and behind the scenes.
          </p>
          <FloralDivider className="mt-4" />
        </header>

        {loading ? (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-square" />)}
          </div>
        ) : error ? (
          <div className="mt-10">
            <EmptyState icon="error" title="Couldn't load gallery" description={error} action={<button className="btn-outline" onClick={() => refetch()}>Try again</button>} />
          </div>
        ) : !data?.length ? (
          <div className="mt-10">
            <EmptyState title="Gallery coming soon" description="Instagram highlights will be curated here by the team." />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.map((g) => {
              const body = (
                <>
                  {g.image ? (
                    <img src={g.image} alt={g.caption || 'Instagram post'} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <PlaceholderImage seed={`ig-${g._id}`} label="Image pending" />
                  )}
                  {g.caption ? (
                    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-8 text-xs font-medium text-white">
                      {g.caption}
                    </p>
                  ) : null}
                </>
              );
              return g.externalUrl ? (
                <a key={g._id} href={g.externalUrl} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
                  {body}
                </a>
              ) : (
                <div key={g._id} className="group relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
                  {body}
                </div>
              );
            })}
          </div>
        )}

        {settings.instagramUrl ? (
          <div className="mt-10 text-center">
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Follow on Instagram
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}
