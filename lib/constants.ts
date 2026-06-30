// Locana - Loyalty App Constants

// Cooldown duration in minutes for stamp scanning
// Prevents abuse by requiring a minimum time between stamps for the same customer
export const STAMP_COOLDOWN_MINUTES = 5;

// App name
export const APP_NAME = 'Locana';

// Default locale
export const DEFAULT_LOCALE = 'id';
export const SUPPORTED_LOCALES = ['id', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
