import dotenv from 'dotenv';

dotenv.config();

const requiredSecrets = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
];

if (process.env.NODE_ENV === 'production') {
  for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
      throw new Error(`CRITICAL ERROR: У production середовищі відсутня обов'язкова змінна ${secret}`);
    }
  }

  // Fail-fast if default insecure values are used in production
  if (process.env.JWT_SECRET === 'super_secret_dormitory_jwt_key_2026') {
    throw new Error('CRITICAL ERROR: У production середовищі використовується дефолтний JWT_SECRET.');
  }
  if (process.env.DIIA_WEBHOOK_SECRET === 'dev_diia_webhook_secret') {
    throw new Error('CRITICAL ERROR: У production середовищі використовується дефолтний DIIA_WEBHOOK_SECRET.');
  }
}

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_dormitory_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_dormitory_refresh_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  apiUrl: process.env.API_URL || process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 4000}/api`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  diiaWebhookSecret: process.env.DIIA_WEBHOOK_SECRET || 'dev_diia_webhook_secret',
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  monobankToken: process.env.MONOBANK_API_TOKEN || ''
};
