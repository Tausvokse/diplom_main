import http from 'http';
import app from './app';
import { config } from './config';
import { initSocket } from './socket';

const server = http.createServer(app);

// Ініціалізація Socket.io
initSocket(server);

server.listen(config.port, () => {
  console.log(`=================================`);
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`🌍 Environment: ${config.environment}`);
  console.log(`=================================`);
});

// Обробка непередбачених помилок
process.on('unhandledRejection', (err: any) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  server.close(() => process.exit(1));
});
