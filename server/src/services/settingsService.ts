import { SiteSettings, type ISiteSettings } from '../models/index.js';

/** Returns the singleton SiteSettings document, creating defaults on first access. */
export async function getSiteSettings(): Promise<ISiteSettings> {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({});
  }
  return settings;
}
