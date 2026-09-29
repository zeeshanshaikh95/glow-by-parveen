import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { publicApi } from '@/api/endpoints';
import type { PublicSettings } from '@/types';

const FALLBACK_SETTINGS: PublicSettings = {
  businessName: 'Glow by Parveen',
  whatsappNumber: '',
  instagramUrl: '',
  email: '',
  mapsUrl: '',
  whatsappTemplate: '',
  whatsappSingleProductTemplate: '',
  hero: { headline: '', subheadline: '', imageUrl: '' },
  about: { intro: '', story: '', founderImageUrl: '' },
  announcements: { enabled: false, text: '' },
};

interface SettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  error: string | null;
  whatsappConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: FALLBACK_SETTINGS,
  loading: true,
  error: null,
  whatsappConfigured: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .getSettings()
      .then(({ settings }) => {
        if (!cancelled) {
          setSettings({ ...FALLBACK_SETTINGS, ...settings });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load site settings');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsappConfigured = Boolean(settings.whatsappNumber);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, whatsappConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
