import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { buildSingleProductMessage } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { formatPrice } from '@/lib/format';
import { PlaceholderImage } from '@/components/PlaceholderImage';
import { FloralDivider } from '@/components/FloralDivider';
import { ProductCard, WhatsAppGlyph } from '@/components/ProductCard';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Stars } from '@/components/Stars';
import { Seo } from '@/components/seo/Seo';
import { EmptyState } from '@/components/EmptyState';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { addItem } = useCart();
  const { settings } = useSettings();

  const { data, loading, error } = useApi(
    () => publicApi.getProduct(slug).then((r) => r.product),
    [slug]
  );
  const related = useApi(
    () => publicApi.getRelated(slug).then((r) => r.products).catch(() => []),
    [slug]
  );
  const reviews = useApi(() => publicApi.listReviews().then((r) => r.reviews), []);

  const product = data;
  const [activeImage, setActiveImage] = useState(0);
  const [variantName, setVariantName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset selections when the product changes.
  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
    setLightboxOpen(false);
  }, [slug]);

  useEffect(() => {
    if (product?.variants.length) {
      setVariantName((prev) =>
        prev && product.variants.some((v) => v.name === prev) ? prev : product.variants[0].name
      );
    } else {
      setVariantName(null);
    }
  }, [product?.variants]);

  useEffect(() => {
    if (product) trackEvent({ type: 'product_view', productSlug: product.slug });
  }, [product?.slug]);

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.name === variantName) ?? null,
    [product, variantName]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="skeleton aspect-square" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          icon="error"
          title="Product not found"
          description={error ?? 'It may have been removed or renamed.'}
          action={<Link to="/shop" className="btn-primary">Back to Shop</Link>}
        />
      </div>
    );
  }

  const outOfStock = product.stockStatus === 'out_of_stock';
  const variantOutOfStock = selectedVariant?.stockStatus === 'out_of_stock';
  const canOrder = !outOfStock && !variantOutOfStock;

  const effectivePrice = selectedVariant?.price ?? product.price;

  const orderMessage = buildSingleProductMessage(settings, {
    productName: product.name,
    variantName: selectedVariant?.name ?? null,
    quantity,
    price: effectivePrice,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.images.length ? product.images : undefined,
    sku: product._id,
    brand: { '@type': 'Brand', name: settings.businessName },
    ...(effectivePrice !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: effectivePrice,
            priceCurrency: 'INR',
            availability: outOfStock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          },
        }
      : {}),
  };

  return (
    <>
      <Seo
        title={product.seoTitle || product.name}
        description={product.seoDescription || product.description.slice(0, 160)}
        canonicalPath={`/product/${product.slug}`}
        ogType="product"
        imageUrl={product.images[0]}
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-brand-700">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/shop" className="hover:text-brand-700">Shop</Link></li>
            {product.category ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to={`/category/${product.category.slug}`} className="hover:text-brand-700">
                    {product.category.name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-ink">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <button
              type="button"
              className="relative block aspect-square w-full overflow-hidden rounded-blob bg-brand-50"
              onClick={() => setLightboxOpen(true)}
              aria-label="Open image gallery"
            >
              {product.images[activeImage] ? (
                <img
                  src={product.images[activeImage]}
                  alt={`${product.name} — image ${activeImage + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <PlaceholderImage seed={product.slug} />
              )}
            </button>

            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                      i === activeImage ? 'border-brand-500' : 'border-transparent'
                    }`}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === activeImage}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.bestseller && <span className="badge-pink">Bestseller</span>}
              {product.featured && <span className="badge-leaf">Featured</span>}
              {outOfStock && <span className="badge-stone">Out of stock</span>}
            </div>

            <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{product.name}</h1>

            <p className="mt-2 text-2xl font-bold text-brand-700">{formatPrice(effectivePrice)}</p>
            {product.compareAtPrice && effectivePrice !== null && product.compareAtPrice > effectivePrice ? (
              <p className="mt-1 text-sm text-ink-soft">
                <s>{formatPrice(product.compareAtPrice)}</s>{' '}
                <span className="font-semibold text-leaf-600">
                  Save {formatPrice(product.compareAtPrice - (effectivePrice ?? 0))}
                </span>
              </p>
            ) : null}
            {product.size ? <p className="mt-1 text-sm text-ink-soft">{product.size}</p> : null}

            {product.variants.length > 0 && (
              <fieldset className="mt-6">
                <legend className="label">Choose an option</legend>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setVariantName(v.name)}
                      disabled={v.stockStatus === 'out_of_stock'}
                      aria-pressed={variantName === v.name}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        variantName === v.name
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-brand-200 bg-white text-ink hover:border-brand-400'
                      } ${v.stockStatus === 'out_of_stock' ? 'cursor-not-allowed line-through opacity-50' : ''}`}
                    >
                      {v.name}
                      {v.price !== null ? ` · ${formatPrice(v.price)}` : ''}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-brand-200 bg-white">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-ink-soft hover:text-brand-700" aria-label="Decrease quantity">−</button>
                <span className="min-w-[2rem] text-center font-semibold" aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="px-4 py-2.5 text-ink-soft hover:text-brand-700" aria-label="Increase quantity">+</button>
              </div>

              <button
                type="button"
                disabled={!canOrder}
                onClick={() => addItem(product, { variantName, quantity })}
                className="btn-outline flex-1"
              >
                Add to Cart
              </button>
            </div>

            <div className="mt-3">
              {canOrder ? (
                <WhatsAppButton
                  message={orderMessage}
                  event="order_whatsapp_click"
                  productSlug={product.slug}
                  label="Order Now on WhatsApp"
                  className="w-full"
                  size="lg"
                />
              ) : (
                <span className="btn-whatsapp w-full cursor-not-allowed justify-center opacity-60" aria-disabled="true">
                  <WhatsAppGlyph /> Currently unavailable
                </span>
              )}
            </div>

            {outOfStock ? (
              <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                This product is currently out of stock — message us on WhatsApp to know when it's back.
              </p>
            ) : null}

            {product.description ? (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold">Description</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{product.description}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detail tabs */}
        <section className="mt-14 grid gap-10 md:grid-cols-2" aria-label="Product information">
          <div className="space-y-8">
            {product.ingredients.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold">Ingredients</h2>
                <FloralDivider className="mt-2 justify-start" />
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.ingredients.map((ing) => (
                    <li key={ing} className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-700">{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {product.benefits.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold">Benefits & Uses</h2>
                <FloralDivider className="mt-2 justify-start" />
                <ul className="mt-3 space-y-2">
                  {product.benefits.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-ink-soft">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-8">
            {product.howToUse && (
              <div>
                <h2 className="font-display text-xl font-semibold">How to Use</h2>
                <FloralDivider className="mt-2 justify-start" />
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{product.howToUse}</p>
              </div>
            )}
            {product.warnings && (
              <div>
                <h2 className="font-display text-xl font-semibold">Care & Notes</h2>
                <FloralDivider className="mt-2 justify-start" />
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">{product.warnings}</p>
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        {reviews.data?.length ? (
          <section className="mt-14" aria-labelledby="pdp-reviews">
            <h2 id="pdp-reviews" className="section-title">Customer Reviews</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reviews.data.slice(0, 6).map((r) => (
                <figure key={r._id} className="card p-6">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-3 text-sm leading-relaxed text-ink-soft">“{r.text}”</blockquote>
                  <figcaption className="mt-3 text-sm font-semibold">— {r.customerName}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* Related products */}
        {related.data?.length ? (
          <section className="mt-14" aria-labelledby="related-heading">
            <h2 id="related-heading" className="section-title">You May Also Like</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.data.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        ) : null}
      </div>

      {/* Lightbox */}
      {lightboxOpen && product.images.length > 0 && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image gallery`}
          onClick={() => setLightboxOpen(false)}
        >
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close gallery">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
          <img
            src={product.images[activeImage]}
            alt={`${product.name} — image ${activeImage + 1}`}
            className="max-h-[85vh] max-w-full rounded-blob object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {product.images.length > 1 && (
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {product.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${i === activeImage ? 'border-brand-400' : 'border-transparent opacity-60'}`}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
