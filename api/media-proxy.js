const STORAGE_ORIGIN = 'https://pncjlbsflsgshmzgiiqu.supabase.co';
const BUCKET_PREFIX = '/storage/v1/object/public/tournament-media/';
const IMAGE_EXT = /\.(?:avif|webp|png|jpe?g|gif|svg|heic)(?:$|\?)/i;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'method_not_allowed' });
  const path = Array.isArray(req.query?.path) ? req.query.path[0] : String(req.query?.path || '');
  if (!path || path.includes('..') || path.startsWith('/') || !IMAGE_EXT.test(path)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid_image_path' });
  }

  const encodedPath = path.split('/').map((part) => encodeURIComponent(part)).join('/');
  const upstream = `${STORAGE_ORIGIN}${BUCKET_PREFIX}${encodedPath}`;
  try {
    const response = await fetch(upstream, {
      method: req.method,
      headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(response.status === 404 ? 404 : 503).json({ error: 'image_temporarily_unavailable' });
    }

    const type = response.headers.get('content-type') || 'application/octet-stream';
    if (!type.startsWith('image/')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(415).json({ error: 'not_an_image' });
    }

    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    const body = Buffer.from(await response.arrayBuffer());
    return res.status(200).send(body);
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'image_temporarily_unavailable' });
  }
}
