import { startServer } from './index.mjs';

startServer({ host: process.env.HOST || '0.0.0.0', port: Number(process.env.PORT || 5352), label: 'BarQ' });
