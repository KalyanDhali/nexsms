import app from './app.js';
import { config } from './config/index.js';
import { initScheduler } from './services/scheduler.js';

app.listen(config.port, () => {
  console.log(`NexSMS backend running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  initScheduler();
});
