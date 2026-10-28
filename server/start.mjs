import http from 'node:http';
import { handler } from './index.mjs';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 5352);
http.createServer(handler).listen(port, host, () => console.log(`BarQ MVP listening on http://${host}:${port}`));
