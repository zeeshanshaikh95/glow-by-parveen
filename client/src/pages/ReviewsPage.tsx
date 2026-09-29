import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { Stars } from '@/components/Stars';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';

export function ReviewsPage() {
  const { data, loading, error, refetch } = useApi(
    () => publicApi.listReviews().then((r) => r.reviews),
    []
  );

  return (
    <>
      <Seo
        title="Customer Reviews & Results"
        description="Real feedback from Glow by Parveen customers on our natural and herbal products."
        canonicalPath="/reviews"
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <p className="eyebrow">Customer Love</p>
          <h1 className="section-title mt-2">Reviews & Results</h1>
          <FloralDivider className="mt-4" />
        </header>

        {loading ? (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-40" />)}
          </div>
        ) : error ? (
          <div className="mt-10">
            <EmptyState icon="error" title="Couldn't load reviews" description={error} action={<button className="btn-outline" onClick={() => refetch()}>Try again</button>} />
          </div>
        ) : !data?.length ? (
          <div className="mt-10">
            <EmptyState
              title="No reviews yet"
              description="Customer reviews will be shared here as soon as they're approved."
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {data.map((r) => (
              <figure key={r._id} className="card flex gap-4 p-6">
                {r.image ? (
                  <img src={r.image} alt={`Photo from ${r.customerName}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : null}
                <div className="flex flex-col">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">“{r.text}”</blockquote>
                  <figcaption className="mt-3 text-sm font-semibold text-ink">— {r.customerName}</figcaption>
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
