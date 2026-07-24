import { createApp } from './app.js';
import { env } from './shared/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Dragon View API listening on port ${env.PORT}`);
});
