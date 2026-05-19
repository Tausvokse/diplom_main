import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { config } from './config';

const app: Application = express();

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
  max: 100, // максимум 100 запитів
  windowMs: 15 * 60 * 1000, // за 15 хвилин з одного IP
  message: 'Забагато запитів з цієї IP адреси, будь ласка, спробуйте пізніше!',
  standardHeaders: true, // Повертає інформацію про ліміт в заголовках `RateLimit-*`
  legacyHeaders: false, // Відключає заголовки `X-RateLimit-*`
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  max: 10, // Строгіший ліміт для авторизації
  windowMs: 10 * 60 * 1000, // 10 хвилин
  message: 'Забагато спроб входу, будь ласка, спробуйте пізніше!'
});
app.use('/api/auth', authLimiter);

// 4. Парсинг тіла запиту (розмір обмежено)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Захист від забруднення параметрів (HTTP Parameter Pollution)
app.use(hpp());

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
