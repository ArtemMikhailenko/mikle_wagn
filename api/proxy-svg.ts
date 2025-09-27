export const config = {
  runtime: 'edge'
};

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

export default async function handler(req: Request) {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': 'content-type',
          'content-length': '0'
        }
      });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) return json(400, { error: 'URL parameter is required' });

    // Basic allowlist: only http/https
    if (!/^https?:\/\//i.test(url)) {
      return json(400, { error: 'Invalid URL scheme' });
    }

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'accept': 'image/svg+xml,*/*'
      },
      // On Edge, fetch has an internal timeout; no per-request timeout option
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!upstream.ok) {
      return json(502, { error: 'Upstream fetch failed', status: upstream.status, statusText: upstream.statusText });
    }

    const text = await upstream.text();

    return new Response(text, {
      status: 200,
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': 'content-type',
        'cache-control': 's-maxage=300, stale-while-revalidate=86400'
      }
    });
  } catch (err: any) {
    return json(500, { error: 'Failed to fetch SVG', message: err?.message || 'Unknown error' });
  }
}
