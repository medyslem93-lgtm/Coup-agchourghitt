import crypto from 'node:crypto';

const b64url = (value) => Buffer.from(value).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return res.status(503).json({ error: 'livekit_not_configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const room = String(body.room || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96);
  const identity = String(body.identity || `viewer-${crypto.randomUUID()}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96);
  const role = body.role === 'publisher' ? 'publisher' : 'viewer';
  if (!room) return res.status(400).json({ error: 'room_required' });

  // Publishing is restricted to an authenticated Supabase admin.
  if (role === 'publisher') {
    const auth = req.headers.authorization || '';
    const supabaseUrl = process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!auth.startsWith('Bearer ') || !supabaseKey) return res.status(401).json({ error: 'admin_auth_required' });
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey: supabaseKey } });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_admin_session' });
    const user = await userResp.json();
    const email = String(user.email || '').toLowerCase();
    const adminResp = await fetch(`${supabaseUrl}/rest/v1/admin_emails?select=email&email=eq.${encodeURIComponent(email)}&limit=1`, { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } });
    const admins = adminResp.ok ? await adminResp.json() : [];
    if (!Array.isArray(admins) || !admins.length) return res.status(403).json({ error: 'admin_required' });
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: apiKey,
    sub: identity,
    nbf: now - 5,
    exp: now + (role === 'publisher' ? 60 * 60 * 6 : 60 * 60 * 2),
    video: {
      room,
      roomJoin: true,
      canPublish: role === 'publisher',
      canSubscribe: true,
      canPublishData: role === 'publisher'
    }
  }));
  const data = `${header}.${payload}`;
  return res.status(200).json({ url, token: `${data}.${sign(data, apiSecret)}`, room, role });
}
