import app from './api/index.ts';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const PORT = 3000;

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const { default: express } = await import('express');
    const exp = express();
    exp.use(express.static(path.join(process.cwd(), 'dist')));
    exp.get('*', (_req: any, res: any) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));
    app.use(exp);
  }
  app.listen(PORT, () => console.log(`VeloxSpace running on http://localhost:${PORT}`));
}
start();
