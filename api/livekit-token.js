import crypto from 'node:crypto';

const b64url = (value) => Buffer.from(value).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
const DEFAULT_SUPABASE_URL = 'https://pncjlbsflsgshmzgiiqu.supabase.co';
const DEFAULT_SUPABASE_PUBLIC_KEY = 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanEnv(name) {
  const raw = String(process.env[name] || '').trim();
  if (raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

async function fetchMatch(matchId, headers) {
  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=id,status,stream_enabled,stream_status,stream_type&limit=1`, { headers });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const url = cleanEnv('LIVEKIT_URL').replace(/\/+$/, '');
  const apiKey = cleanEnv('LIVEKIT_API_KEY');
  const apiSecret = cleanEnv('LIVEKIT_API_SECRET');
  if (!/^wss:\/\//i.test(url) || !apiKey || !apiSecret) return res.status(503).json({ error: 'livekit_not_configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const matchId = String(body.matchId || '').trim();
  const identity = String(body.identity || `viewer-${crypto.randomUUID()}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96);
  const role = body.role === 'publisher' ? 'publisher' : 'viewer';
  if (!UUID.test(matchId)) return res.status(400).json({ error: 'match_required' });

  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLIC_KEY;
  const publicHeaders = { apikey: publicKey };
  let match = null;

  if (role === 'publisher') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'admin_auth_required' });
    const headers = { Authorization: auth, apikey: publicKey };
    const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_admin_session' });
    const user = await userResp.json();
    const email = String(user.email || '').toLowerCase();
    const adminResp = await fetch(`${supabaseUrl}/rest/v1/admin_emails?select=email&email=eq.${encodeURIComponent(email)}&limit=1`, { headers });
    const admins = adminResp.ok ? await adminResp.json() : [];
    if (!Array.isArray(admins) || !admins.length) return res.status(403).json({ error: 'admin_required' });
    match = await fetchMatch(matchId, headers);
  } else {
    match = await fetchMatch(matchId, publicHeaders);
    if (!match || !match.stream_enabled || match.stream_status !== 'live' || match.stream_type !== 'livekit' || match.status === 'انتهت') {
      return res.status(409).json({ error: 'stream_not_live' });
    }
  }

  if (!match) return res.status(404).json({ error: 'match_not_found' });
  const room = `match-${matchId}`;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now - 5,
    exp: now + (role === 'publisher' ? 7200 : 3600),
    jti: crypto.randomUUID(),
    video: { room, roomJoin: true, canPublish: role === 'publisher', canSubscribe: true, canPublishData: role === 'publisher' }
  }));
  const data = `${header}.${payload}`;
  return res.status(200).json({ url, token: `${data}.${sign(data, apiSecret)}`, room, role });
}
