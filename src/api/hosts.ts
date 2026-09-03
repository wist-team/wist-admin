export const HOSTS = {
  /** Express services on the EC2 box, reverse-proxied by path prefix. */
  api: 'https://api.syfthealth.app',
  /** Current meal photo bucket (build 26). */
  mealImages: 'https://wist-meal-images.s3.eu-west-1.amazonaws.com',
  /** Legacy meal photo host (2024 backup); used only as a fallback. */
  legacyImages: 'https://images.syfthealth.app/userimages',
} as const;

export const ADMIN_KEY_HEADER = 'x-wist-proxy-key';
