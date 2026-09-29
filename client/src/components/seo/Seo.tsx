import { Helmet } from 'react-helmet-async';
import { OG_IMAGE_ABSOLUTE, SITE_URL } from '@/lib/brand';

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product' | 'article';
  imageUrl?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

const SITE_NAME = 'Glow by Parveen';

export function Seo({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  imageUrl,
  jsonLd,
  noIndex = false,
}: Props) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  const canonical = `${SITE_URL}${canonicalPath ?? ''}`;
  // Falls back to the brand social image so every page shares something on-brand.
  const socialImage = imageUrl ?? OG_IMAGE_ABSOLUTE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={socialImage} />
      <meta name="twitter:image" content={socialImage} />
      <meta name="twitter:card" content="summary_large_image" />

      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}

      {jsonLd
        ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((obj, i) => (
            <script key={i} type="application/ld+json">
              {JSON.stringify(obj)}
            </script>
          ))
        : null}
    </Helmet>
  );
}
