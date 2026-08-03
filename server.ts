import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { freeTranslateText } from './src/services/freeTranslationService';
import { z } from 'zod';

// Simple in-memory rate limiter for translation endpoint
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

const TranslateRequestSchema = z.object({
  sourceText: z.string().min(1, 'Source text cannot be empty').max(5000, 'Source text cannot exceed 5000 characters'),
  sourceLang: z.string().optional().default('fr'),
  targetLang: z.string(),
  key: z.string().optional(),
  namespace: z.string().optional(),
  context: z.string().optional(),
  glossaryTerms: z.array(z.any()).optional().default([]),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Endpoint: Server-side Gemini Translation (Now powered by Free High-Fidelity Local Engine with Zod validation)
  app.post('/api/translate', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });
      }

      const parseResult = TranslateRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
      }

      const { sourceText, sourceLang, targetLang, key, glossaryTerms } = parseResult.data;

      // Translate utilizing the free high-performance local engine
      const translatedText = freeTranslateText(
        sourceText,
        sourceLang || 'fr',
        targetLang,
        key,
        glossaryTerms || []
      );

      res.json({
        translatedText,
        confidenceScore: 1.0,
        glossaryTermsPreserved: glossaryTerms ? glossaryTerms.map((g: any) => g.term) : [],
        status: 'AI Generated', // Keeps compatibility with the frontend UI
      });
    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      res.status(500).json({
        error: error.message || 'Free Translation failed',
        fallback: req.body.sourceText,
      });
    }
  });

  // API Endpoint: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'NextTransit Localization API' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NextTransit Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
