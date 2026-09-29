import { useSettings } from '@/context/SettingsContext';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { WhatsAppGlyph } from '@/components/ProductCard';

export function ContactPage() {
  const { settings, whatsappConfigured } = useSettings();

  return (
    <>
      <Seo
        title="Contact Us"
        description="Reach Glow by Parveen on WhatsApp for orders, questions and personalised recommendations."
        canonicalPath="/contact"
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="text-center">
          <p className="eyebrow">Get in touch</p>
          <h1 className="section-title mt-2">Contact Glow by Parveen</h1>
          <FloralDivider className="mt-4" />
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            The fastest way to reach us is WhatsApp — ask about products, availability, delivery
            or get a personalised recommendation.
          </p>
        </header>

        <div className="mt-10 space-y-4">
          <div className="card flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10 text-[#1EB855]">
              <WhatsAppGlyph className="h-7 w-7" />
            </span>
            <h2 className="font-display text-xl font-semibold">WhatsApp</h2>
            {whatsappConfigured ? (
              <>
                <p className="text-sm text-ink-soft">
                  Message us directly — we'll reply with availability and delivery details.
                </p>
                <WhatsAppButton
                  message="Hi Glow by Parveen! 🌸 I have a question."
                  label="Chat on WhatsApp"
                  size="lg"
                />
              </>
            ) : (
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                [CLIENT DATA REQUIRED] — WhatsApp number pending
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6 text-center">
              <h2 className="font-display text-lg font-semibold">Instagram</h2>
              {settings.instagramUrl ? (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Follow @glowbyparveen
                </a>
              ) : (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  [CLIENT DATA REQUIRED] — Instagram link
                </p>
              )}
            </div>

            <div className="card p-6 text-center">
              <h2 className="font-display text-lg font-semibold">Email</h2>
              {settings.email ? (
                <a href={`mailto:${settings.email}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                  {settings.email}
                </a>
              ) : (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  [CLIENT DATA REQUIRED] — Email address
                </p>
              )}
            </div>
          </div>

          {settings.mapsUrl ? (
            <div className="card p-6 text-center">
              <h2 className="font-display text-lg font-semibold">Find Us</h2>
              <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                Open in Google Maps →
              </a>
            </div>
          ) : null}
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-ink-soft/80">
          Business hours, shipping timelines and policies: <span className="font-semibold">[CLIENT DATA REQUIRED]</span>
        </p>
      </div>
    </>
  );
}
