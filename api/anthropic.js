// ════════════════════════════════════════════════════════════════════
// /api/anthropic — Proxy serverless para la API de Claude
// ════════════════════════════════════════════════════════════════════
// El Reporte Mailchimp con IA llamaba a api.anthropic.com directo desde
// el browser: eso expone la API key y CORS lo bloquea. Este endpoint
// corre en Vercel (server-side) y hace la llamada con la key secreta.
//
// Requiere en Vercel → Settings → Environment Variables:
//   ANTHROPIC_API_KEY = sk-ant-...   (server-only, NUNCA con prefijo VITE_)
//
// En dev local (npm run dev) este endpoint NO existe — la feature de IA
// solo funciona en producción (o corriendo `vercel dev`).
// ════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

// Análisis de PDFs puede tardar más que los 10s default
export const maxDuration = 60;

const ALLOWED_ORIGINS = [
  'https://mar-comms-hub.vercel.app',
  'http://localhost:5173',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  // Barrera básica contra uso desde otros sitios (no es auth real,
  // pero evita que cualquier página ajena consuma la key).
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith('.vercel.app')) {
    res.status(403).json({ error: 'Origen no permitido' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });
    return;
  }

  const { messages, max_tokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Falta el campo messages' });
    return;
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: Math.min(Number(max_tokens) || 1000, 4096),
      messages,
    });
    res.status(200).json(message);
  } catch (e) {
    console.error('[api/anthropic]', e);
    res.status(e.status || 500).json({ error: e.message || 'Error llamando a la API de Claude' });
  }
}
