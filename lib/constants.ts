// Locana - Loyalty App Constants

// Cooldown duration in minutes for stamp scanning
// Prevents abuse by requiring a minimum time between stamps for the same customer
export const STAMP_COOLDOWN_MINUTES = 5;

// Stamps needed to fill the loyalty card (matches the top active reward target,
// "Locana Coffee" = 10). When a customer reaches this, the card is full and the
// reward can be redeemed.
export const STAMP_CARD_TARGET = 10;

// App name
export const APP_NAME = 'Locana';

// Default locale
export const DEFAULT_LOCALE = 'id';
export const SUPPORTED_LOCALES = ['id', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
