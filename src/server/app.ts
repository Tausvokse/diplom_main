import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { config } from './config';

const app: Application = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Безпекові HTTP-заголовки (Helmet)
app.use(helmet());

// 2. CORS (Динамічний захист)
app.use(cors({
  origin: (origin, callback) => {
    // Дозволяємо запити без origin (наприклад, сервер-сервер або мобільні додатки)
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Не дозволено CORS політикою'));
    }
  },
  credentials: true,
}));

// 3. Обмеження кількості запитів (Rate Limiting)
const limiter = rateLimit({
  max: 1500, // максимум 1500 запитів
  windowMs: 15 * 60 * 1000, // за 15 хвилин з одного IP
  message: 'Забагато запитів з цієї IP адреси, будь ласка, спробуйте пізніше!',
  standardHeaders: true, // Повертає інформацію про ліміт в заголовках `RateLimit-*`
  legacyHeaders: false, // Відключає заголовки `X-RateLimit-*`
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  max: 100, // Строгіший ліміт для авторизації
  windowMs: 10 * 60 * 1000, // 10 хвилин
  message: 'Забагато спроб входу, будь ласка, спробуйте пізніше!'
});
app.use('/api/auth', authLimiter);

// 4. Парсинг тіла запиту (розмір обмежено)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Захист від забруднення параметрів (HTTP Parameter Pollution)
app.use(hpp());

// Статичні файли для завантажень
const uploadsDir = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', routes);

// Serve client build in production
if (config.environment === 'production') {
  const clientDist = path.join(__dirname, '../../dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

export default app;
