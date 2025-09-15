import config from './config.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/top-albums') {
      return handleTopAlbums();
    }
    return new Response('Not Found', { status: 404 });
  }
};

async function handleTopAlbums() {
  const cacheKey = new Request('https://cache/albums');
  const cache = caches.default;
  
  let response = await cache.match(cacheKey);
  if (response) return response;
  
  try {
    const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${config.LASTFM_USERNAME}&api_key=${config.LASTFM_API_KEY}&period=1month&limit=5&format=json`;
    const lastfmResponse = await fetch(lastfmUrl);
    const data = await lastfmResponse.json();
    
    if (data.error) throw new Error();
    
    const albums = (data.topalbums?.album || []).slice(0, 5).map(album => ({
      name: album.name,
      artist: album.artist.name,
      playcount: parseInt(album.playcount),
      url: album.url,
      image: album.image?.[2]?.['#text'] || null
    }));
    
    response = new Response(JSON.stringify({ albums }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
    
    await cache.put(cacheKey, response.clone());
    return response;
    
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}