import { Link } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page Not Found" noIndex />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="font-display text-7xl font-bold text-brand-300">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">This page has wilted away</h1>
        <FloralDivider className="mt-4" />
        <p className="mt-4 text-sm text-ink-soft">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/shop" className="btn-outline">Shop Products</Link>
        </div>
      </div>
    </>
  );
}
