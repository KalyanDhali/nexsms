import app from './app.js';
import { config } from './config/index.js';
import { initScheduler } from './services/scheduler.js';

// Safety net: a single malformed request must never take down the whole
// backend. Async route handlers in Express 4 don't forward rejections to
// the error middleware, so log and keep serving.
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason?.stack || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err?.stack || err);
});

app.listen(config.port, () => {
  console.log(`NexSMS backend running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  initScheduler();
});
