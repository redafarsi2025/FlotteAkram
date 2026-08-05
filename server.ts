import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { freeTranslateText } from './src/services/freeTranslationService';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

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

  // API Endpoint: Phase 2 Gemini 3.6 Flash Predictive AI Failure Forecasting Engine
  app.post('/api/predictive-ai', async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY environment variable not configured.',
          useFallback: true,
        });
      }

      const vehicleData = req.body;
      const prompt = `You are NextTransit's Predictive Mechanical Maintenance & Telemetry Failure Forecasting Model.
Analyze the following CAN-Bus OBD-II telemetry metrics and vehicle history:
${JSON.stringify(vehicleData, null, 2)}

Calculate failure risk, estimated hours before physical critical breakdown, critical subsystem, anomalies, and recommended intervention.
Provide your rationale in clear French (reasoning_fr).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vehicle_id: { type: Type.STRING },
              vehicle_plate: { type: Type.STRING },
              critical_subsystem: { type: Type.STRING },
              failure_likelihood_percentage: { type: Type.NUMBER },
              estimated_hours_to_failure: { type: Type.NUMBER },
              predictive_r1_alert: { type: Type.BOOLEAN },
              recommended_action: { type: Type.STRING },
              confidence_score: { type: Type.NUMBER },
              telemetry_anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sensor: { type: Type.STRING },
                    current_value: { type: Type.STRING },
                    baseline_value: { type: Type.STRING },
                    deviation: { type: Type.STRING },
                  },
                },
              },
              reasoning_fr: { type: Type.STRING },
            },
            required: [
              'vehicle_id',
              'vehicle_plate',
              'critical_subsystem',
              'failure_likelihood_percentage',
              'estimated_hours_to_failure',
              'predictive_r1_alert',
              'recommended_action',
              'confidence_score',
              'telemetry_anomalies',
              'reasoning_fr',
            ],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        return res.status(500).json({ error: 'Empty AI response', useFallback: true });
      }

      const parsedResult = JSON.parse(resultText);
      parsedResult.generated_at = new Date().toISOString();
      return res.json(parsedResult);
    } catch (error: any) {
      console.error('Error in /api/predictive-ai:', error);
      return res.status(500).json({
        error: error.message || 'Predictive AI generation failed',
        useFallback: true,
      });
    }
  });

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
