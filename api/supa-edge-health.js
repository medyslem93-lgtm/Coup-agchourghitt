const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const ANON_JWT = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuY2psYnNmbHNnc2htemdpaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjk3NDEsImV4cCI6MjA5OTg0NTc0MX0.40VWENOf_OYgxVI5pIPC7ekR3FcHDjSnTAuYb53pxdc';

export default async function handler(req, res) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agh-db-health`, {
      headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT },
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', response.headers.get('content-type') || 'text/plain').send(text);
  } catch (error) {
    res.status(500).json({ error: String(error?.message || error) });
  }
}
