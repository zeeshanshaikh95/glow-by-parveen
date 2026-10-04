import { useSettings } from '@/context/SettingsContext';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';
import { Link } from 'react-router-dom';
import { FOUNDER_IMAGE } from '@/lib/brand';

export function AboutPage() {
  const { settings } = useSettings();

  return (
    <>
      <Seo
        title="About Glow by Parveen"
        description="The story behind Glow by Parveen — handcrafted natural and herbal beauty products."
        canonicalPath="/about"
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <p className="eyebrow">Our Story</p>
          <h1 className="section-title mt-2">About Glow by Parveen</h1>
          <FloralDivider className="mt-4" />
        </header>

        <div className="mx-auto mt-10 aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[24px] bg-brand-50 shadow-card">
          <img
            src={settings.about.founderImageUrl || FOUNDER_IMAGE}
            alt="Parveen, founder of Glow by Parveen"
            width={1122}
            height={1402}
            decoding="async"
            className="h-full w-full object-cover object-[50%_28%]"
          />
        </div>

        <div className="prose-pink mt-10 space-y-5 text-center">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-ink">
            {settings.about.intro ||
              'Glow by Parveen is a natural/herbal beauty brand offering handcrafted, small-batch personal care products.'}
          </p>

          {settings.about.story && settings.about.story !== '[CLIENT DATA REQUIRED]' ? (
            <p className="mx-auto max-w-2xl whitespace-pre-line leading-relaxed text-ink-soft">
              {settings.about.story}
            </p>
          ) : (
            <div className="mx-auto max-w-2xl rounded-blob border-2 border-dashed border-brand-200 bg-white/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
                [CLIENT DATA REQUIRED]
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                The full brand story will be added here once approved copy is provided — no
                claims are invented.
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center gap-3">
          <Link to="/shop" className="btn-primary">Shop Products</Link>
          <Link to="/contact" className="btn-outline">Contact Us</Link>
        </div>
      </div>
    </>
  );
}
