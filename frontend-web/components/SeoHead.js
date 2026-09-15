/**
 * SeoHead — balises SEO dynamiques par page.
 * Utiliser dans chaque page avec <SeoHead title="..." description="..." />
 *
 * Usage minimal :
 *   <SeoHead title="Location appartement Ouagadougou" description="..." />
 *
 * Usage complet (page annonce) :
 *   <SeoHead
 *     title="Villa 4 pièces à Ouaga 2000"
 *     description="Magnifique villa..."
 *     image="https://..."
 *     type="article"
 *     jsonLd={[ldProperty, ldBreadcrumb]}
 *   />
 */

import Head from "next/head";
import { useRouter } from "next/router";

const SITE_URL = "https://www.immoafrica.online";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_TITLE = "ImmoBF Africa — Immobilier en Afrique de l'Ouest";
const DEFAULT_DESC = "Achetez, louez ou vendez un bien immobilier au Burkina Faso et en Afrique de l'Ouest. Paiement Orange Money, Wave, Moov Money. App iOS & Android.";

export default function SeoHead({
  title,
  description,
  image,
  type = "website",
  noindex = false,
  jsonLd = [],  // tableau d'objets schema.org à injecter
}) {
  const router = useRouter();
  const canonical = `${SITE_URL}${router.asPath.split("?")[0].split("#")[0]}`;
  const fullTitle = title ? `${title} | ImmoBF Africa` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESC;
  const img = image || DEFAULT_IMAGE;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* hreflang fr / en */}
      <link rel="alternate" hrefLang="fr" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {/* JSON-LD supplémentaire */}
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </Head>
  );
}
