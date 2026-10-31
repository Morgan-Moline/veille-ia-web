import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_URL = process.env.DATA_URL || 'https://raw.githubusercontent.com/Morgan-Moline/veille-ia-data/main/data.json';
const TRIGGER_URL = process.env.TRIGGER_URL || 'https://veille-ia-trigger.themomo450.workers.dev/';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json({ limit: '32kb' }));

async function getData() {
  const response = await fetch(`${DATA_URL}?refresh=${Date.now()}`, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub a répondu ${response.status}`);
  const data = await response.json();
  if (!data || !Array.isArray(data.articles)) throw new Error('Le fichier data.json ne contient pas de liste articles valide.');
  return data;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'veille-ia-api' }));
app.get('/api/articles', async (_req, res) => {
  try {
    const data = await getData();
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Impossible de récupérer les actualités.', details: error.message });
  }
});
app.get('/api/status', async (_req, res) => {
  try {
    const data = await getData();
    res.json({ updated_at: data.updated_at || null, count: data.articles.length });
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.post('/api/trigger', async (req, res) => {
  const secret = req.get('authorization');
  if (!secret || !secret.startsWith('Bearer ')) return res.status(401).json({ error: 'Secret d’accès manquant.' });
  try {
    const response = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { Authorization: secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(25000)
    });
    const body = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'text/plain').send(body);
  } catch (error) { res.status(502).json({ error: 'Impossible de contacter le service de veille.', details: error.message }); }
});

const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'), error => {
  if (error) res.status(404).send('Frontend non construit. Lancez npm run build.');
}));
app.listen(PORT, () => console.log(`Veille IA API disponible sur http://localhost:${PORT}`));
