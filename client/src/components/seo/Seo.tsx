import { Helmet } from 'react-helmet-async';

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product' | 'article';
  imageUrl?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost:5173';
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
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />

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
