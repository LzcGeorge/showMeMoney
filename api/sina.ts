export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get('list');
  if (!list) return new Response('missing ?list=...', { status: 400 });

  const upstream = 'https://hq.sinajs.cn/list=' + list;

  const r = await fetch(upstream, {
    headers: {
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
    },
    cache: 'no-store',
  });

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=0, s-maxage=5',
    'Content-Type':
      r.headers.get('content-type') || 'text/javascript; charset=GBK',
  });

  return new Response(await r.arrayBuffer(), { status: r.status, headers });
}