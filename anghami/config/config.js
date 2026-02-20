module.exports = {
  urls: {
    base: 'https://www.anghami.com/',
    likedSongs: 'https://www.anghami.com/library/songs',
    playlists: 'https://www.anghami.com/library/playlists',
    albums: 'https://www.anghami.com/library/albums',
    youtube: {
      base: 'https://www.youtube.com/',
      search: 'https://www.youtube.com/results?search_query='
    }
  },
  
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000
  },
  
  timeouts: {
    navigation: 30000,
    element: 10000,
    click: 5000
  },
  
  browser: {
    headless: false,
    slowMo: 0,
    viewport: { width: 1280, height: 720 }
  },
  
  paths: {
    cookies: 'data/session/cookies.json',
    youtubeCookies: 'data/session/youtube_cookies.json',
    output: 'data/output/songs.json'
  },
  
  scraping: {
    scrollDelay: 2000,
    maxScrolls: 100,
    progressInterval: 50,
    scrollStrategy: 'page'
  }
}
