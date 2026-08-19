export async function onRequest(context) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = context.env;

  const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
  const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
  const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*'
  };

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return new Response(JSON.stringify({ isPlaying: false, isRecentlyPlayed: false, error: 'Missing environment variables' }), {
      status: 500,
      headers: defaultHeaders
    });
  }

  try {
    const basic = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: SPOTIFY_REFRESH_TOKEN
      })
    });

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ isPlaying: false, isRecentlyPlayed: false }), {
        headers: defaultHeaders
      });
    }

    const { access_token } = await tokenRes.json();

    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (nowPlayingRes.status === 200) {
      const data = await nowPlayingRes.json();
      if (data && data.item) {
        return new Response(JSON.stringify({
          isPlaying: data.is_playing,
          isRecentlyPlayed: false,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          albumImageUrl: data.item.album.images[0]?.url,
          songUrl: data.item.external_urls.spotify,
          progressMs: data.progress_ms,
          durationMs: data.item.duration_ms
        }), {
          headers: defaultHeaders
        });
      }
    }

    const recentlyRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (recentlyRes.status === 200) {
      const recentData = await recentlyRes.json();
      const lastTrack = recentData.items?.[0]?.track;
      if (lastTrack) {
        return new Response(JSON.stringify({
          isPlaying: false,
          isRecentlyPlayed: true,
          title: lastTrack.name,
          artist: lastTrack.artists.map(a => a.name).join(', '),
          albumImageUrl: lastTrack.album.images[0]?.url,
          songUrl: lastTrack.external_urls.spotify,
          progressMs: 0,
          durationMs: 0
        }), {
          headers: defaultHeaders
        });
      }
    }

    return new Response(JSON.stringify({ isPlaying: false, isRecentlyPlayed: false }), {
      headers: defaultHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ isPlaying: false, isRecentlyPlayed: false }), {
      headers: defaultHeaders
    });
  }
}