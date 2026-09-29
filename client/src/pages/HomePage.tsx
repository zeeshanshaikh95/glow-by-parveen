import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useSettings } from '@/context/SettingsContext';
import { ProductCard } from '@/components/ProductCard';
import { PlaceholderImage } from '@/components/PlaceholderImage';
import { FloralDivider } from '@/components/FloralDivider';
import { Stars } from '@/components/Stars';
import { Seo } from '@/components/seo/Seo';
import { EmptyState } from '@/components/EmptyState';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { trackEvent } from '@/lib/analytics';
import { truncate } from '@/lib/format';

export function HomePage() {
  const { settings } = useSettings();
  const categories = useApi(() => publicApi.listCategories().then((r) => r.categories), []);
  const bestsellers = useApi(
    () => publicApi.listProducts({ sort: 'bestseller' }).then((r) => r.products.filter((p) => p.bestseller)),
    []
  );
  const featured = useApi(
    () => publicApi.listProducts({ sort: 'featured' }).then((r) => r.products.filter((p) => p.featured)),
    []
  );
  const reviews = useApi(() => publicApi.listReviews().then((r) => r.reviews), []);
  const gallery = useApi(() => publicApi.listGallery().then((r) => r.items), []);

  useEffect(() => {
    trackEvent({ type: 'page_view', path: '/' });
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.businessName,
    ...(settings.instagramUrl ? { sameAs: [settings.instagramUrl] } : {}),
  };

  return (
    <>
      <Seo
        title="Glow by Parveen — Natural & Herbal Beauty"
        description="Handcrafted natural and herbal beauty products. Browse the catalogue and order easily on WhatsApp."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush to-cream">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-100/70 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-leaf-50 blur-2xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="animate-fade-up">
              <p className="eyebrow">Natural · Herbal · Handcrafted</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
                {settings.hero.headline || 'Natural herbal beauty, handcrafted with care'}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
                {settings.hero.subheadline ||
                  'Discover handcrafted, natural skincare made in small batches. Explore our products and order directly on WhatsApp.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/shop" className="btn-primary">
                  Shop Products
                </Link>
                <WhatsAppButton
                  message="Hi Glow by Parveen! 🌸 I would like to enquire about your products."
                  label="Order / Enquire on WhatsApp"
                />
              </div>
              <p className="mt-4 text-xs text-ink-soft/80">
                Personalised service on WhatsApp — we reply with availability & delivery details.
              </p>
            </div>

            <div className="relative hidden aspect-[4/5] overflow-hidden rounded-blob shadow-soft md:block">
              {settings.hero.imageUrl ? (
                <img
                  src={settings.hero.imageUrl}
                  alt="Glow by Parveen hero"
                  className="h-full w-full object-cover"
                />
              ) : (
                <PlaceholderImage seed="hero" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="categories-heading">
        <div className="text-center">
          <p className="eyebrow">Browse</p>
          <h2 id="categories-heading" className="section-title mt-2">Shop by Category</h2>
          <FloralDivider className="mt-4" />
        </div>

        {categories.loading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-44" />)}
          </div>
        ) : categories.error ? (
          <div className="mt-8"><EmptyState icon="error" title="Couldn't load categories" description={categories.error} action={<button className="btn-outline" onClick={() => categories.refetch()}>Try again</button>} /></div>
        ) : !categories.data?.length ? (
          <div className="mt-8">
            <EmptyState
              title="Our categories are on the way"
              description="We're preparing the collection. Follow us on Instagram or message us on WhatsApp to hear when it launches."
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {categories.data.map((cat) => (
              <Link
                key={cat._id}
                to={`/category/${cat.slug}`}
                className="card group relative overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden bg-brand-50">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <PlaceholderImage seed={cat.slug} />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4 pt-10">
                  <h3 className="font-display text-lg font-semibold text-white">{truncate(cat.name, 40)}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Bestsellers ───────────────────────────────────────── */}
      <section className="bg-blush/50 py-14" aria-labelledby="bestsellers-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="eyebrow">Loved by our customers</p>
            <h2 id="bestsellers-heading" className="section-title mt-2">Bestsellers</h2>
            <FloralDivider className="mt-4" />
          </div>

          {bestsellers.loading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72" />)}
            </div>
          ) : bestsellers.error ? (
            <div className="mt-8"><EmptyState icon="error" title="Couldn't load products" description={bestsellers.error} /></div>
          ) : !bestsellers.data?.length ? (
            <div className="mt-8">
              <EmptyState
                title="No products available yet"
                description="Our products will appear here as soon as the catalogue is ready."
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {bestsellers.data.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/shop" className="btn-outline">View All Products</Link>
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      {featured.data?.length ? (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="featured-heading">
          <div className="text-center">
            <p className="eyebrow">Special picks</p>
            <h2 id="featured-heading" className="section-title mt-2">Featured Products</h2>
            <FloralDivider className="mt-4" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.data.slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      ) : null}

      {/* ── Why Glow by Parveen ────────────────────────────────── */}
      <section className="bg-white py-14" aria-labelledby="why-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="eyebrow">Our promise</p>
            <h2 id="why-heading" className="section-title mt-2">Why Glow by Parveen</h2>
            <FloralDivider className="mt-4" />
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Natural & Herbal', text: 'Formulated with natural and herbal ingredients, prepared with care.' },
              { title: 'Handcrafted in Small Batches', text: 'Each batch is made by hand in limited quantities for freshness.' },
              { title: 'Personal WhatsApp Service', text: 'Direct, personal guidance before you order — straight from the maker.' },
            ].map((item) => (
              <div key={item.title} className="card p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21c-5-3-8-6.5-8-10a5 5 0 018-4 5 5 0 018 4c0 3.5-3 7-8 10z" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.text}</p>
              </div>
            ))}
          </div>
          {/* NOTE: only neutral, non-medical wording is used above. Replace with the
              client's approved benefit copy once supplied (PRD §7.6). */}
        </div>
      </section>

      {/* ── About teaser ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="about-heading">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-blob bg-brand-50 shadow-card md:aspect-[4/3]">
            {settings.about.founderImageUrl ? (
              <img src={settings.about.founderImageUrl} alt="Founder of Glow by Parveen" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <PlaceholderImage seed="founder" />
            )}
          </div>
          <div>
            <p className="eyebrow">Our story</p>
            <h2 id="about-heading" className="section-title mt-2">About Glow by Parveen</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              {settings.about.intro ||
                'Glow by Parveen is a natural/herbal beauty brand offering handcrafted, small-batch personal care products.'}
            </p>
            <div className="mt-6">
              <Link to="/about" className="btn-outline">Read Our Story</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────── */}
      <section className="bg-blush/50 py-14" aria-labelledby="reviews-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="eyebrow">Customer love</p>
            <h2 id="reviews-heading" className="section-title mt-2">Reviews & Results</h2>
            <FloralDivider className="mt-4" />
          </div>

          {reviews.loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40" />)}</div>
          ) : !reviews.data?.length ? (
            <div className="mt-8">
              <EmptyState
                title="No reviews yet"
                description="Customer reviews will be shared here as soon as they're approved."
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {reviews.data.slice(0, 6).map((r) => (
                <figure key={r._id} className="card flex flex-col p-6">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    “{r.text}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-ink">— {r.customerName}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link to="/reviews" className="btn-outline">See All Reviews</Link>
          </div>
        </div>
      </section>

      {/* ── Instagram gallery ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="gallery-heading">
        <div className="text-center">
          <p className="eyebrow">On Instagram</p>
          <h2 id="gallery-heading" className="section-title mt-2">@glowbyparveen</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            A hand-picked selection from our Instagram — follow us for new products and behind the scenes.
          </p>
        </div>

        {gallery.data?.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {gallery.data.slice(0, 6).map((g) => {
              const inner = (
                <>
                  {g.image ? (
                    <img src={g.image} alt={g.caption || 'Instagram post'} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <PlaceholderImage seed={`ig-${g._id}`} />
                  )}
                </>
              );
              return g.externalUrl ? (
                <a key={g._id} href={g.externalUrl} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
                  {inner}
                </a>
              ) : (
                <div key={g._id} className="group relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
                  {inner}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="Instagram gallery coming soon"
              description="We're curating our favourite posts — follow along on Instagram in the meantime."
            />
          </div>
        )}

        {settings.instagramUrl ? (
          <div className="mt-8 text-center">
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Follow on Instagram
            </a>
          </div>
        ) : null}
      </section>

      {/* ── Final WhatsApp CTA ────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-500 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to glow?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            Message us on WhatsApp for personalised recommendations, availability and delivery details.
          </p>
          <div className="mt-8">
            <WhatsAppButton
              message="Hi Glow by Parveen! 🌸 I would like to enquire about your products."
              label="Chat on WhatsApp"
              size="lg"
              className="!bg-white !text-brand-700 hover:!bg-brand-50"
            />
          </div>
        </div>
      </section>
    </>
  );
}
