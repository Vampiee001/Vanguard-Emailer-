import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateRealEstateEmail, extractPropertyFromPdf } from './api/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/generate-email', async (req, res) => {
  try {
    const result = await generateRealEstateEmail(req.body);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown generation failure';
    console.error('Server error /api/generate-email:', message);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-property-pdf', async (req, res) => {
  try {
    const result = await extractPropertyFromPdf(req.body);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PDF extraction error';
    console.error('Server error /api/extract-property-pdf:', message);
    res.status(500).json({ error: message });
  }
});

// Serve static assets from dist in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Vanguard Estates Server running on port ${port}`);
});
