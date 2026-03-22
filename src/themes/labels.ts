// ── Theme vocabulary system ────────────────────────────────────────────────────
// Every theme gets its own language for all UI text.
// Default English is the base; other themes override what they want.

export interface ThemeLabels {
  // ── Sidebar nav ─────────────────────────────────────────────────
  navHome: string
  navSongs: string
  navAlbums: string
  navArtists: string
  navGenres: string
  navLikes: string
  navStats: string
  navTagEditor: string
  navPlaylists: string
  navSearchPlaceholder: string
  navNoPlaylists: string

  // ── Core entity names ────────────────────────────────────────────
  songs: string
  albums: string
  artists: string
  genres: string
  playlists: string
  likes: string

  // ── Count formatters ─────────────────────────────────────────────
  songCount: (n: number) => string
  albumCount: (n: number) => string
  artistCount: (n: number) => string
  trackCount: (n: number) => string   // generic "X tracks"

  // ── Song list column headers ─────────────────────────────────────
  colTitle: string
  colArtist: string
  colAlbum: string
  colDuration: string

  // ── Home page ────────────────────────────────────────────────────
  heroSub: string
  heroTitle: string
  playBtn: string
  shuffleBtn: string
  recentlyPlayed: string
  recentlyAdded: string
  listeningStats: string   // home stats card title

  // ── Stats page ───────────────────────────────────────────────────
  statsTitle: string
  statsListening: string
  statsPlays: string
  statsAvgPerDay: string
  statsPeakSegment: string
  statsTopCategories: string
  statsTopCategoriesDesc: string
  statsTopSongs: string
  statsTopArtists: string
  statsTopAlbums: string
  statsNoData: string
  statsTabSong: string
  statsTabAlbum: string
  statsTabArtist: string

  // ── Genres page ──────────────────────────────────────────────────
  genresTitle: string
  genresSearch: string
  genresNone: string
  genresNoTracks: string

  // ── Likes page ───────────────────────────────────────────────────
  likesTitle: string
  likesEmpty: string
  likesEmptySub: string

  // ── Loading / empty ──────────────────────────────────────────────
  scanning: string
  noSongsFound: string
}

// ── Default (standard English) ────────────────────────────────────────────────
const DEFAULT: ThemeLabels = {
  navHome:              'Home',
  navSongs:             'Songs',
  navAlbums:            'Albums',
  navArtists:           'Artists',
  navGenres:            'Genres',
  navLikes:             'Likes',
  navStats:             'Stats',
  navTagEditor:         'Tag Editor',
  navPlaylists:         'Playlists',
  navSearchPlaceholder: 'Search library…',
  navNoPlaylists:       'No playlists yet',

  songs:     'Songs',
  albums:    'Albums',
  artists:   'Artists',
  genres:    'Genres',
  playlists: 'Playlists',
  likes:     'Liked Songs',

  songCount:   (n) => `${n} song${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} album${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} artist${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} track${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Artist',
  colAlbum:    'Album',
  colDuration: 'Duration',

  heroSub:         "Today's Mix for you",
  heroTitle:       'Your Mix',
  playBtn:         'Play',
  shuffleBtn:      'Shuffle',
  recentlyPlayed:  'Recently Played',
  recentlyAdded:   'Recently Added',
  listeningStats:  'Listening Stats',

  statsTitle:             'Listening Stats',
  statsListening:         'Listening',
  statsPlays:             'Plays',
  statsAvgPerDay:         'Avg/day',
  statsPeakSegment:       'Peak segment',
  statsTopCategories:     'Top categories',
  statsTopCategoriesDesc: 'Compare how you listen across songs, albums, and artists.',
  statsTopSongs:          'Listening by song',
  statsTopArtists:        'Top artists',
  statsTopAlbums:         'Top albums',
  statsNoData:            'No data for this period',
  statsTabSong:           'Song',
  statsTabAlbum:          'Album',
  statsTabArtist:         'Artist',

  genresTitle:    'Genres',
  genresSearch:   'Search genre...',
  genresNone:     'No genres found',
  genresNoTracks: 'No tracks loaded',

  likesTitle:    'Liked Songs',
  likesEmpty:    'No liked songs yet',
  likesEmptySub: 'Tap the heart icon on any song to save it here',

  scanning:     'Scanning…',
  noSongsFound: 'No songs found',
}

// ── Theme overrides ────────────────────────────────────────────────────────────

const GOTH: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Sanctuary',
  navSongs:             'Souls',
  navAlbums:            'Tomes',
  navArtists:           'Phantoms',
  navGenres:            'Covenants',
  navLikes:             'Devotions',
  navStats:             'Chronicles',
  navTagEditor:         'Codex',
  navPlaylists:         'Scrolls',
  navSearchPlaceholder: 'Search the grimoire…',
  navNoPlaylists:       'No scrolls yet',

  songs:     'Souls',
  albums:    'Tomes',
  artists:   'Phantoms',
  genres:    'Covenants',
  playlists: 'Scrolls',
  likes:     'Devotions',

  songCount:   (n) => `${n} soul${n !== 1 ? 's' : ''} recorded`,
  albumCount:  (n) => `${n} tome${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} phantom${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} soul${n !== 1 ? 's' : ''}`,

  colTitle:    'Inscription',
  colArtist:   'Phantom',
  colAlbum:    'Tome',
  colDuration: 'Eternity',

  heroSub:        'The veil grows thin tonight',
  heroTitle:      'Your Devotion',
  playBtn:        'Summon',
  shuffleBtn:     'Chaos',
  recentlyPlayed: 'Recently Summoned',
  recentlyAdded:  'Newly Bound',
  listeningStats: 'Dark Chronicles',

  statsTitle:             'Chronicles of Darkness',
  statsListening:         'In Darkness',
  statsPlays:             'Summonings',
  statsAvgPerDay:         'Per Night',
  statsPeakSegment:       'Darkest Hour',
  statsTopCategories:     'Most Haunted',
  statsTopCategoriesDesc: 'Compare what haunts you most across souls, tomes, and phantoms.',
  statsTopSongs:          'Most Haunting Souls',
  statsTopArtists:        'Dark Phantoms',
  statsTopAlbums:         'Sacred Tomes',
  statsNoData:            'The void speaks nothing',
  statsTabSong:           'Soul',
  statsTabAlbum:          'Tome',
  statsTabArtist:         'Phantom',

  genresTitle:    'Covenants',
  genresSearch:   'Search covenants…',
  genresNone:     'No covenants found',
  genresNoTracks: 'The grimoire is empty',

  likesTitle:    'Pledged Souls',
  likesEmpty:    'No souls pledged yet',
  likesEmptySub: 'Mark a song with devotion to pledge it here',

  scanning:     'Conjuring…',
  noSongsFound: 'The grimoire is empty',
}

const RAMBO: ThemeLabels = {
  ...DEFAULT,
  navHome:              'BASE CAMP',
  navSongs:             'OBJECTIVES',
  navAlbums:            'SECTORS',
  navArtists:           'OPERATIVES',
  navGenres:            'CLASSES',
  navLikes:             'PRIORITY',
  navStats:             'INTEL',
  navTagEditor:         'FIELD EDIT',
  navPlaylists:         'DOSSIERS',
  navSearchPlaceholder: 'SEARCH INTEL…',
  navNoPlaylists:       'NO DOSSIERS',

  songs:     'OBJECTIVES',
  albums:    'SECTORS',
  artists:   'OPERATIVES',
  genres:    'CLASSES',
  playlists: 'DOSSIERS',
  likes:     'PRIORITY TARGETS',

  songCount:   (n) => `${n} OBJECTIVES LOADED`,
  albumCount:  (n) => `${n} SECTORS`,
  artistCount: (n) => `${n} OPERATIVES`,
  trackCount:  (n) => `${n} OBJECTIVES`,

  colTitle:    'OBJECTIVE',
  colArtist:   'OPERATIVE',
  colAlbum:    'SECTOR',
  colDuration: 'DURATION',

  heroSub:        'DAILY BRIEFING — CLASSIFIED',
  heroTitle:      'MISSION CONTROL',
  playBtn:        'EXECUTE',
  shuffleBtn:     'SCRAMBLE',
  recentlyPlayed: 'RECENT OPS',
  recentlyAdded:  'NEW ACQUISITIONS',
  listeningStats: 'INTEL SUMMARY',

  statsTitle:             'INTEL REPORT',
  statsListening:         'RUNTIME',
  statsPlays:             'EXECUTIONS',
  statsAvgPerDay:         'DAILY OP',
  statsPeakSegment:       'PEAK WINDOW',
  statsTopCategories:     'PRIORITY INTEL',
  statsTopCategoriesDesc: 'Compare intel across objectives, sectors, and operatives.',
  statsTopSongs:          'HIGH VALUE TARGETS',
  statsTopArtists:        'PRIME OPERATIVES',
  statsTopAlbums:         'TOP SECTORS',
  statsNoData:            'NO INTEL FOR PERIOD',
  statsTabSong:           'OBJECTIVE',
  statsTabAlbum:          'SECTOR',
  statsTabArtist:         'OPERATIVE',

  genresTitle:    'CLASSIFICATIONS',
  genresSearch:   'SEARCH CLASS…',
  genresNone:     'NO CLASSES FOUND',
  genresNoTracks: 'NO OBJECTIVES LOADED',

  likesTitle:    'PRIORITY TARGETS',
  likesEmpty:    'NO TARGETS FLAGGED',
  likesEmptySub: 'Mark objectives as priority for extraction',

  scanning:     'SCANNING SECTORS…',
  noSongsFound: 'NO OBJECTIVES FOUND',
}

const BLAME: ThemeLabels = {
  ...DEFAULT,
  navHome:              'NETSPHERE',
  navSongs:             'NODES',
  navAlbums:            'STRATA',
  navArtists:           'VECTORS',
  navGenres:            'DATA_TYPES',
  navLikes:             'FLAGGED',
  navStats:             'SYS.LOG',
  navTagEditor:         'DATA_EDIT',
  navPlaylists:         'SEQUENCES',
  navSearchPlaceholder: 'QUERY…',
  navNoPlaylists:       'NO SEQUENCES',

  songs:     'NODES',
  albums:    'STRATA',
  artists:   'VECTORS',
  genres:    'DATA_TYPES',
  playlists: 'SEQUENCES',
  likes:     'FLAGGED',

  songCount:   (n) => `${n} RECORDS`,
  albumCount:  (n) => `${n} STRATA`,
  artistCount: (n) => `${n} VECTORS`,
  trackCount:  (n) => `${n} NODES`,

  colTitle:    'SIGNAL_PATH',
  colArtist:   'ORIGIN',
  colAlbum:    '//',
  colDuration: 'CYCLE',

  heroSub:        'NETSPHERE AUTO-SEQUENCE',
  heroTitle:      'DAILY STREAM',
  playBtn:        'EXECUTE',
  shuffleBtn:     'RANDOMIZE',
  recentlyPlayed: 'RECENTLY ACCESSED',
  recentlyAdded:  'NEW NODES',
  listeningStats: 'NEURAL ACTIVITY',

  statsTitle:             'NEURAL ACTIVITY LOG',
  statsListening:         'CPU_TIME',
  statsPlays:             'CALLS',
  statsAvgPerDay:         'CALLS/DAY',
  statsPeakSegment:       'PEAK_WINDOW',
  statsTopCategories:     'TOP NODES',
  statsTopCategoriesDesc: 'Compare activity across nodes, strata, and vectors.',
  statsTopSongs:          'MOST ACCESSED NODES',
  statsTopArtists:        'TOP VECTORS',
  statsTopAlbums:         'TOP STRATA',
  statsNoData:            'NO DATA IN SECTOR',
  statsTabSong:           'NODE',
  statsTabAlbum:          'STRATUM',
  statsTabArtist:         'VECTOR',

  genresTitle:    'DATA_TYPES',
  genresSearch:   'QUERY TYPE…',
  genresNone:     'NO TYPES FOUND',
  genresNoTracks: 'NO NODES LOADED',

  likesTitle:    'FLAGGED NODES',
  likesEmpty:    'NO NODES FLAGGED',
  likesEmptySub: 'Flag nodes for priority retrieval from the Netsphere',

  scanning:     'SCANNING STRATA…',
  noSongsFound: 'NO NODES FOUND',
}

const CYBERPUNK: ThemeLabels = {
  ...DEFAULT,
  navHome:              'MAINFRAME',
  navSongs:             'TRACKS',
  navAlbums:            'DISCS',
  navArtists:           'NETRUNNERS',
  navGenres:            'PROTOCOLS',
  navLikes:             'SAVED',
  navStats:             'SYS.MONITOR',
  navTagEditor:         'DATA_EDIT',
  navPlaylists:         'ROUTINES',
  navSearchPlaceholder: 'SEARCH_NET…',
  navNoPlaylists:       'NO ROUTINES',

  songs:     'TRACKS',
  albums:    'DISCS',
  artists:   'NETRUNNERS',
  genres:    'PROTOCOLS',
  playlists: 'ROUTINES',
  likes:     'SAVED_NODES',

  songCount:   (n) => `${n} STREAMS`,
  albumCount:  (n) => `${n} DISCS`,
  artistCount: (n) => `${n} RUNNERS`,
  trackCount:  (n) => `${n} TRACKS`,

  colTitle:    'DATA_STREAM',
  colArtist:   'NETRUNNER',
  colAlbum:    'DISC_ID',
  colDuration: 'RUNTIME',

  heroSub:        'NEURAL PLAYLIST — AUTO-GENERATED',
  heroTitle:      'SYS.MIX',
  playBtn:        'RUN',
  shuffleBtn:     'RANDOM',
  recentlyPlayed: 'RECENT_RUNS',
  recentlyAdded:  'NEW_UPLOADS',
  listeningStats: 'SYS.MONITOR',

  statsTitle:             'SYS.MONITOR',
  statsListening:         'NET_TIME',
  statsPlays:             'RUNS',
  statsAvgPerDay:         'RUNS/DAY',
  statsPeakSegment:       'PEAK_LOAD',
  statsTopCategories:     'TOP_DATA',
  statsTopCategoriesDesc: 'Compare data streams across tracks, discs, and runners.',
  statsTopSongs:          'HOT_STREAMS',
  statsTopArtists:        'TOP_RUNNERS',
  statsTopAlbums:         'TOP_DISCS',
  statsNoData:            'NO_DATA: NULL',
  statsTabSong:           'TRACK',
  statsTabAlbum:          'DISC',
  statsTabArtist:         'RUNNER',

  genresTitle:    'PROTOCOLS',
  genresSearch:   'QUERY_PROTOCOL…',
  genresNone:     'NO_PROTOCOLS_FOUND',
  genresNoTracks: 'NO_STREAMS_LOADED',

  likesTitle:    'SAVED_NODES',
  likesEmpty:    'NO NODES SAVED',
  likesEmptySub: 'Flag streams to save them to your node cache',

  scanning:     'NET_SCAN…',
  noSongsFound: 'NO_STREAMS_FOUND',
}

const SAKURA: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Home ✿',
  navSongs:             'Songs ♪',
  navAlbums:            'Albums ✦',
  navArtists:           'Artists ♡',
  navGenres:            'Vibes ✿',
  navLikes:             'Favorites ♡',
  navStats:             'Activity ✧',
  navTagEditor:         'Edit Tags',
  navPlaylists:         'Playlists ✿',
  navSearchPlaceholder: 'Search ♡…',
  navNoPlaylists:       'No playlists yet ✿',

  songs:     'Songs',
  albums:    'Albums',
  artists:   'Artists',
  genres:    'Vibes',
  playlists: 'Playlists',
  likes:     'Favorites',

  songCount:   (n) => `${n} song${n !== 1 ? 's' : ''} ♪`,
  albumCount:  (n) => `${n} album${n !== 1 ? 's' : ''} ✦`,
  artistCount: (n) => `${n} artist${n !== 1 ? 's' : ''} ♡`,
  trackCount:  (n) => `${n} track${n !== 1 ? 's' : ''} ✿`,

  colTitle:    'Title',
  colArtist:   'Artist',
  colAlbum:    'Album',
  colDuration: 'Time',

  heroSub:        'Curated just for you ✿',
  heroTitle:      'Your Mix ♡',
  playBtn:        'Play ♪',
  shuffleBtn:     'Shuffle ✦',
  recentlyPlayed: 'Recently Played ✦',
  recentlyAdded:  'Recently Added ✿',
  listeningStats: 'Activity ✧',

  statsTitle:             'Listening Activity ✧',
  statsListening:         'Listening',
  statsPlays:             'Plays',
  statsAvgPerDay:         'Avg/day',
  statsPeakSegment:       'Peak Time ✦',
  statsTopCategories:     'Favorites ♡',
  statsTopCategoriesDesc: 'See what songs, albums, and artists you love most ♡',
  statsTopSongs:          'Top Songs ♪',
  statsTopArtists:        'Top Artists ♡',
  statsTopAlbums:         'Top Albums ✦',
  statsNoData:            'Nothing yet ✿',
  statsTabSong:           'Song ♪',
  statsTabAlbum:          'Album ✦',
  statsTabArtist:         'Artist ♡',

  genresTitle:    'Vibes ✿',
  genresSearch:   'Search vibes…',
  genresNone:     'No vibes found ✿',
  genresNoTracks: 'Library is empty ✿',

  likesTitle:    'Favorites ♡',
  likesEmpty:    'No favorites yet ✿',
  likesEmptySub: 'Tap the heart on any song to add it here ♡',

  scanning:     'Loading… ✿',
  noSongsFound: 'No songs found ✿',
}

const BALMAIN: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Maison',
  navSongs:             'Pieces',
  navAlbums:            'Collections',
  navArtists:           'Maisons',
  navGenres:            'Houses',
  navLikes:             'Coveted',
  navStats:             'Portfolio',
  navTagEditor:         'Edit Metadata',
  navPlaylists:         'Curations',
  navSearchPlaceholder: 'Search the collection…',
  navNoPlaylists:       'No curations yet',

  songs:     'Pieces',
  albums:    'Collections',
  artists:   'Maisons',
  genres:    'Houses',
  playlists: 'Curations',
  likes:     'Coveted Pieces',

  songCount:   (n) => `${n} piece${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} collection${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} maison${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} piece${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Maison',
  colAlbum:    'Collection',
  colDuration: 'Duration',

  heroSub:        'The editorial selection',
  heroTitle:      'Your Curation',
  playBtn:        'Play',
  shuffleBtn:     'Mix',
  recentlyPlayed: 'Recently Worn',
  recentlyAdded:  'New Arrivals',
  listeningStats: 'Your Portfolio',

  statsTitle:             'Portfolio',
  statsListening:         'Total Time',
  statsPlays:             'Listens',
  statsAvgPerDay:         'Daily',
  statsPeakSegment:       'Peak Moment',
  statsTopCategories:     'Top Selections',
  statsTopCategoriesDesc: 'Compare your most-worn pieces, collections, and maisons.',
  statsTopSongs:          'Most Worn Pieces',
  statsTopArtists:        'Favorite Maisons',
  statsTopAlbums:         'Top Collections',
  statsNoData:            'No data for this period',
  statsTabSong:           'Piece',
  statsTabAlbum:          'Collection',
  statsTabArtist:         'Maison',

  genresTitle:    'Houses',
  genresSearch:   'Search houses…',
  genresNone:     'No houses found',
  genresNoTracks: 'Collection is empty',

  likesTitle:    'Coveted Pieces',
  likesEmpty:    'Nothing coveted yet',
  likesEmptySub: 'Mark a piece to add it to your coveted collection',

  scanning:     'Curating…',
  noSongsFound: 'No pieces found',
}

const OCEAN: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Harbor',
  navSongs:             'Waves',
  navAlbums:            'Tides',
  navArtists:           'Mariners',
  navGenres:            'Currents',
  navLikes:             'Treasures',
  navStats:             'Depth Chart',
  navTagEditor:         'Tag Editor',
  navPlaylists:         'Voyages',
  navSearchPlaceholder: 'Search the depths…',
  navNoPlaylists:       'No voyages yet',

  songs:     'Waves',
  albums:    'Tides',
  artists:   'Mariners',
  genres:    'Currents',
  playlists: 'Voyages',
  likes:     'Treasures',

  songCount:   (n) => `${n} wave${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} tide${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} mariner${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} wave${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Mariner',
  colAlbum:    'Tide',
  colDuration: 'Duration',

  heroSub:        'The daily drift',
  heroTitle:      'Your Voyage',
  playBtn:        'Set Sail',
  shuffleBtn:     'Drift',
  recentlyPlayed: 'Recent Waters',
  recentlyAdded:  'New Arrivals',
  listeningStats: 'Depth Chart',

  statsTitle:             'Depth Chart',
  statsListening:         'At Sea',
  statsPlays:             'Drifts',
  statsAvgPerDay:         'Per Day',
  statsPeakSegment:       'Highest Tide',
  statsTopCategories:     'Deep Cuts',
  statsTopCategoriesDesc: 'Compare your deepest waves, tides, and mariners.',
  statsTopSongs:          'Deepest Waves',
  statsTopArtists:        'Top Mariners',
  statsTopAlbums:         'Top Tides',
  statsNoData:            'Still waters — no data',
  statsTabSong:           'Wave',
  statsTabAlbum:          'Tide',
  statsTabArtist:         'Mariner',

  genresTitle:    'Currents',
  genresSearch:   'Search currents…',
  genresNone:     'No currents found',
  genresNoTracks: 'The ocean is still',

  likesTitle:    'Treasures',
  likesEmpty:    'No treasures found yet',
  likesEmptySub: 'Mark a wave to treasure it here',

  scanning:     'Navigating…',
  noSongsFound: 'No waves found',
}

const VAPORWAVE: ThemeLabels = {
  ...DEFAULT,
  navHome:              'A E S T H E T I C',
  navSongs:             'Tracks',
  navAlbums:            'Albums',
  navArtists:           'Artists',
  navGenres:            'Aesthetics',
  navLikes:             'Saved',
  navStats:             'Nostalgia Log',
  navTagEditor:         'Tag Editor',
  navPlaylists:         'Playlists',
  navSearchPlaceholder: 'Search…',
  navNoPlaylists:       'No playlists yet',

  songs:     'Tracks',
  albums:    'Albums',
  artists:   'Artists',
  genres:    'Aesthetics',
  playlists: 'Playlists',
  likes:     'Saved',

  songCount:   (n) => `${n} track${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} album${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} artist${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} track${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Artist',
  colAlbum:    'Album',
  colDuration: 'Duration',

  heroSub:        'Your daily aesthetic ✦',
  heroTitle:      'A E S T H E T I C',
  playBtn:        'Play',
  shuffleBtn:     'Drift',
  recentlyPlayed: 'Recently Played',
  recentlyAdded:  'New Uploads',
  listeningStats: 'Nostalgia Log',

  statsTitle:             'Nostalgia Log',
  statsListening:         'Time Lost',
  statsPlays:             'Plays',
  statsAvgPerDay:         'Per Day',
  statsPeakSegment:       'Peak Vibe',
  statsTopCategories:     'Top Aesthetics',
  statsTopCategoriesDesc: 'Compare your most nostalgic tracks, albums, and artists.',
  statsTopSongs:          'Most Nostalgic',
  statsTopArtists:        'Top Artists',
  statsTopAlbums:         'Top Albums',
  statsNoData:            'Nothing yet — vibe harder',
  statsTabSong:           'Track',
  statsTabAlbum:          'Album',
  statsTabArtist:         'Artist',

  genresTitle:    'Aesthetics',
  genresSearch:   'Search aesthetic…',
  genresNone:     'No aesthetics found',
  genresNoTracks: 'Library is empty',

  likesTitle:    'Saved Tracks',
  likesEmpty:    'No saved tracks yet',
  likesEmptySub: 'Tap the heart to save a vibe here',

  scanning:     'Loading…',
  noSongsFound: 'Nothing found',
}

const MINIMAL: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Home',
  navSearchPlaceholder: 'Search',
  navNoPlaylists:       'Empty',
  navStats:             'Stats',

  songCount:   (n) => `${n}`,
  albumCount:  (n) => `${n}`,
  artistCount: (n) => `${n}`,
  trackCount:  (n) => `${n}`,

  heroSub:        'Your mix',
  heroTitle:      'Mix',
  playBtn:        'Play',
  shuffleBtn:     'Shuffle',
  recentlyPlayed: 'Recent',
  recentlyAdded:  'New',
  listeningStats: 'Stats',

  statsTitle:             'Stats',
  statsListening:         'Time',
  statsPlays:             'Plays',
  statsAvgPerDay:         'Daily',
  statsPeakSegment:       'Peak',
  statsTopCategories:     'Top',
  statsTopCategoriesDesc: 'Songs, albums, artists.',
  statsTopSongs:          'Songs',
  statsTopArtists:        'Artists',
  statsTopAlbums:         'Albums',
  statsNoData:            'No data',
  statsTabSong:           'Song',
  statsTabAlbum:          'Album',
  statsTabArtist:         'Artist',

  genresTitle:  'Genres',
  genresSearch: 'Search',
  genresNone:   'None',

  likesTitle:    'Likes',
  likesEmpty:    'Empty',
  likesEmptySub: 'Tap the heart on any song',

  scanning:     'Scanning',
  noSongsFound: 'Empty',
}

const FOREST: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Clearing',
  navSongs:             'Sounds',
  navAlbums:            'Groves',
  navArtists:           'Wanderers',
  navGenres:            'Paths',
  navLikes:             'Gathered',
  navStats:             'Forest Log',
  navTagEditor:         'Tag Editor',
  navPlaylists:         'Trails',
  navSearchPlaceholder: 'Search the forest…',
  navNoPlaylists:       'No trails yet',

  songs:     'Sounds',
  albums:    'Groves',
  artists:   'Wanderers',
  genres:    'Paths',
  playlists: 'Trails',
  likes:     'Gathered Sounds',

  songCount:   (n) => `${n} sound${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} grove${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} wanderer${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} sound${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Wanderer',
  colAlbum:    'Grove',
  colDuration: 'Duration',

  heroSub:        'The sounds of the forest',
  heroTitle:      'Your Trail',
  playBtn:        'Walk the Path',
  shuffleBtn:     'Wander',
  recentlyPlayed: 'Recently Heard',
  recentlyAdded:  'Newly Found',
  listeningStats: 'Forest Log',

  statsTitle:             'Forest Log',
  statsListening:         'Time Wandered',
  statsPlays:             'Walks',
  statsAvgPerDay:         'Per Day',
  statsPeakSegment:       'Peak Hour',
  statsTopCategories:     'Favorite Paths',
  statsTopCategoriesDesc: 'Compare your most wandered sounds, groves, and wanderers.',
  statsTopSongs:          'Most Wandered',
  statsTopArtists:        'Favorite Wanderers',
  statsTopAlbums:         'Top Groves',
  statsNoData:            'The forest is quiet',
  statsTabSong:           'Sound',
  statsTabAlbum:          'Grove',
  statsTabArtist:         'Wanderer',

  genresTitle:    'Paths',
  genresSearch:   'Search paths…',
  genresNone:     'No paths found',
  genresNoTracks: 'The forest is empty',

  likesTitle:    'Gathered Sounds',
  likesEmpty:    'Nothing gathered yet',
  likesEmptySub: 'Mark a sound to gather it here',

  scanning:     'Wandering…',
  noSongsFound: 'The forest is silent',
}

const EMBER: ThemeLabels = {
  ...DEFAULT,
  navHome:              'Hearth',
  navSongs:             'Embers',
  navAlbums:            'Flames',
  navArtists:           'Storytellers',
  navGenres:            'Hearths',
  navLikes:             'Kindled',
  navStats:             'Hearthside Log',
  navTagEditor:         'Tag Editor',
  navPlaylists:         'Gatherings',
  navSearchPlaceholder: 'Search the hearth…',
  navNoPlaylists:       'No gatherings yet',

  songs:     'Embers',
  albums:    'Flames',
  artists:   'Storytellers',
  genres:    'Hearths',
  playlists: 'Gatherings',
  likes:     'Kindled Songs',

  songCount:   (n) => `${n} ember${n !== 1 ? 's' : ''}`,
  albumCount:  (n) => `${n} flame${n !== 1 ? 's' : ''}`,
  artistCount: (n) => `${n} storyteller${n !== 1 ? 's' : ''}`,
  trackCount:  (n) => `${n} ember${n !== 1 ? 's' : ''}`,

  colTitle:    'Title',
  colArtist:   'Storyteller',
  colAlbum:    'Flame',
  colDuration: 'Duration',

  heroSub:        'Warm up by the fire',
  heroTitle:      'Your Hearth',
  playBtn:        'Stoke the Fire',
  shuffleBtn:     'Embers',
  recentlyPlayed: 'Recently Heard',
  recentlyAdded:  'Newly Gathered',
  listeningStats: 'Hearthside Log',

  statsTitle:             'Hearthside Log',
  statsListening:         'By the Fire',
  statsPlays:             'Plays',
  statsAvgPerDay:         'Per Day',
  statsPeakSegment:       'Brightest Ember',
  statsTopCategories:     'Favorites',
  statsTopCategoriesDesc: 'Compare your hottest embers, flames, and storytellers.',
  statsTopSongs:          'Hottest Embers',
  statsTopArtists:        'Best Storytellers',
  statsTopAlbums:         'Top Flames',
  statsNoData:            'The fire is cold',
  statsTabSong:           'Ember',
  statsTabAlbum:          'Flame',
  statsTabArtist:         'Storyteller',

  genresTitle:    'Hearths',
  genresSearch:   'Search hearths…',
  genresNone:     'No hearths found',
  genresNoTracks: 'The hearth is cold',

  likesTitle:    'Kindled Songs',
  likesEmpty:    'Nothing kindled yet',
  likesEmptySub: 'Mark a song to kindle it here',

  scanning:     'Stoking…',
  noSongsFound: 'No embers found',
}

// ── Registry ──────────────────────────────────────────────────────────────────
export const THEME_LABELS: Record<string, ThemeLabels> = {
  default:   DEFAULT,
  goth:      GOTH,
  rambo:     RAMBO,
  blame:     BLAME,
  cyberpunk: CYBERPUNK,
  anime:     SAKURA,
  balmain:   BALMAIN,
  ocean:     OCEAN,
  vaporwave: VAPORWAVE,
  minimal:   MINIMAL,
  forest:    FOREST,
  ember:     EMBER,
}

export function getLabels(theme: string): ThemeLabels {
  return THEME_LABELS[theme] ?? DEFAULT
}
