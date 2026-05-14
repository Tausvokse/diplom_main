import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

app.use(cors({ origin: '*' })); // Для продакшену потрібно вказати конкретні домени
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
