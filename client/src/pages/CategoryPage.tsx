import { Link, useParams } from 'react-router-dom';
import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { data, loading, error } = useApi(
    () => publicApi.getCategory(slug),
    [slug]
  );

  return (
    <>
      {data ? (
        <Seo
          title={data.category.name}
          description={data.category.description || `Browse ${data.category.name} from Glow by Parveen.`}
          canonicalPath={`/category/${data.category.slug}`}
        />
      ) : (
        <Seo title="Category" canonicalPath={`/category/${slug}`} />
      )}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {loading ? (
          <>
            <div className="skeleton mx-auto h-8 w-64" />
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72" />)}
            </div>
          </>
        ) : error || !data ? (
          <div className="py-10">
            <EmptyState
              icon="error"
              title="Category not found"
              description={error ?? 'It may have been removed or renamed.'}
              action={<Link to="/shop" className="btn-primary">Browse All Products</Link>}
            />
          </div>
        ) : (
          <>
            <header className="text-center">
              <p className="eyebrow">Category</p>
              <h1 className="section-title mt-2">{data.category.name}</h1>
              {data.category.description ? (
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  {data.category.description}
                </p>
              ) : null}
              <FloralDivider className="mt-4" />
            </header>

            {data.category.image ? (
              <div className="mx-auto mt-6 aspect-[21/9] max-w-4xl overflow-hidden rounded-blob bg-brand-50">
                <img src={data.category.image} alt={data.category.name} className="h-full w-full object-cover" />
              </div>
            ) : null}

            {data.products.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  title="No products in this category yet"
                  description="Check back soon, or browse the full catalogue."
                  action={<Link to="/shop" className="btn-outline">Browse All Products</Link>}
                />
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {data.products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            )}

            <div className="mt-12 text-center">
              <Link to="/shop" className="btn-outline">← Browse all products</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
