import dotenv from 'dotenv';

dotenv.config();

const requiredSecrets = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL'
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
}

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_dormitory_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_dormitory_refresh_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173']
};
