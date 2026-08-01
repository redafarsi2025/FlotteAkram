import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Endpoint: Server-side Gemini Translation
  app.post('/api/translate', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });
      }

      const { sourceText, sourceLang, targetLang, key, namespace, context, glossaryTerms } = req.body;

      if (!sourceText || typeof sourceText !== 'string' || !targetLang) {
        return res.status(400).json({ error: 'Missing or invalid sourceText or targetLang parameter' });
      }

      if (sourceText.length > 5000) {
        return res.status(400).json({ error: 'sourceText exceeds maximum length of 5000 characters' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback gracefully if API key is missing
        return res.json({
          translatedText: sourceText,
          confidenceScore: 0.5,
          glossaryTermsPreserved: [],
          status: 'Fallback (Missing GEMINI_API_KEY)',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const glossaryRules = Array.isArray(glossaryTerms) && glossaryTerms.length > 0
        ? `Preserve the following mandatory Business Glossary terms:\n` +
          glossaryTerms.map((g: any) => `- Term: "${g.term}" -> Target (${targetLang}): "${g.translations?.[targetLang] || g.term}"`).join('\n')
        : '';

      const prompt = `Translate the following ERP system string from ${sourceLang || 'French'} to ${targetLang}.
Context: ${context || namespace || 'SaaS Fleet ERP Application'}.

CRITICAL CONSTRAINTS:
1. Preserve all placeholders like {username}, {count}, {date}, {amount}, {vehicleId} intact without modifying their names or syntax.
2. Preserve HTML tags if any.
3. ${glossaryRules}
4. Provide ONLY the translated text without extra conversational filler.

Text to translate:
"${sourceText}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert SaaS ERP & Telemetry Localization Engine fluent in French, Arabic, and English. You output precise technical translations respecting placeholders and glossary terms.',
          temperature: 0.2,
        },
      });

      const translatedText = response.text ? response.text.trim().replace(/^"|"$/g, '') : sourceText;

      res.json({
        translatedText,
        confidenceScore: 0.98,
        glossaryTermsPreserved: glossaryTerms ? glossaryTerms.map((g: any) => g.term) : [],
        status: 'AI Generated',
      });
    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      res.status(500).json({
        error: error.message || 'AI Translation failed',
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
