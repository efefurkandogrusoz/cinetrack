// TMDB API Service
// Configure your TMDB API key in environment variables
// VITE_TMDB_API_KEY=your_api_key_here

const API_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

export const GENRE_MAP = {
  12: 'Macera',
  14: 'Fantastik',
  16: 'Animasyon',
  18: 'Dram',
  27: 'Korku',
  28: 'Aksiyon',
  35: 'Komedi',
  36: 'Tarih',
  37: 'Western',
  53: 'Gerilim',
  80: 'Suç',
  99: 'Belgesel',
  878: 'Bilim Kurgu',
  9648: 'Gizem',
  10402: 'Müzik',
  10749: 'Romantik',
  10751: 'Aile',
  10752: 'Savaş',
  10770: 'TV Filmi',
};

// Get API key from environment
const getApiKey = () => {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) {
    console.warn('TMDB API key not found. Please set VITE_TMDB_API_KEY in .env');
  }
  return key;
};

// Search movies by query
export const searchMovies = async (query) => {
  if (!query.trim()) return [];

  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const response = await fetch(
      `${API_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`
    );

    if (!response.ok) throw new Error('Failed to fetch movies');

    const data = await response.json();
    return formatMovies(data.results || []);
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

// Get movie details by ID
export const getMovieDetails = async (movieId) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const response = await fetch(
      `${API_BASE_URL}/movie/${movieId}?api_key=${apiKey}`
    );

    if (!response.ok) throw new Error('Failed to fetch movie details');

    const data = await response.json();
    return formatMovie(data);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const getMovieFullDetails = async (movieId) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const response = await fetch(
      `${API_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos`
    );

    if (!response.ok) throw new Error('Failed to fetch full movie details');

    const data = await response.json();
    const trailer = (data.videos?.results || []).find(video =>
      video.site === 'YouTube' && video.type === 'Trailer'
    ) || (data.videos?.results || []).find(video => video.site === 'YouTube');

    return {
      ...formatMovie(data),
      runtime: data.runtime || null,
      cast: (data.credits?.cast || []).slice(0, 8).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
      })),
      trailerKey: trailer?.key || null,
    };
  } catch (error) {
    console.error('Error fetching full movie details:', error);
    return null;
  }
};

export const discoverMoviesByGenres = async (genreIds = [], excludedMovieIds = []) => {
  const cleanedGenreIds = genreIds.filter(Boolean).slice(0, 3);
  if (cleanedGenreIds.length === 0) return [];

  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const params = new URLSearchParams({
      api_key: apiKey,
      include_adult: 'false',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '300',
      with_genres: cleanedGenreIds.join(','),
    });

    const response = await fetch(`${API_BASE_URL}/discover/movie?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch recommendations');

    const data = await response.json();
    const excluded = new Set(excludedMovieIds);

    return formatMovies(data.results || [])
      .filter(movie => !excluded.has(movie.id))
      .slice(0, 8);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const getMovieCatalog = async ({
  query = '',
  genreId = 'all',
  sortBy = 'popularity.desc',
  page = 1,
} = {}) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return { results: [], page: 1, totalPages: 1 };

    const cleanedQuery = query.trim();
    const params = new URLSearchParams({
      api_key: apiKey,
      include_adult: 'false',
      page: String(page),
    });

    const endpoint = cleanedQuery ? 'search/movie' : 'discover/movie';

    if (cleanedQuery) {
      params.set('query', cleanedQuery);
    } else {
      params.set('sort_by', sortBy);
      params.set('vote_count.gte', sortBy === 'vote_average.desc' ? '250' : '0');

      if (genreId !== 'all') {
        params.set('with_genres', String(genreId));
      }
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch movie catalog');

    const data = await response.json();

    return {
      results: formatMovies(data.results || []),
      page: data.page || page,
      totalPages: Math.min(data.total_pages || 1, 500),
    };
  } catch (error) {
    console.error('Error fetching movie catalog:', error);
    return { results: [], page: 1, totalPages: 1 };
  }
};

export const getPopularMovies = async () => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const response = await fetch(
      `${API_BASE_URL}/movie/popular?api_key=${apiKey}&include_adult=false`
    );

    if (!response.ok) throw new Error('Failed to fetch popular movies');

    const data = await response.json();
    return formatMovies(data.results || []).slice(0, 10);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
};

export const getTopRatedMovies = async () => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const response = await fetch(
      `${API_BASE_URL}/movie/top_rated?api_key=${apiKey}&include_adult=false`
    );

    if (!response.ok) throw new Error('Failed to fetch top rated movies');

    const data = await response.json();
    return formatMovies(data.results || []).slice(0, 10);
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return [];
  }
};

const getTrendingMovies = async (timeWindow) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const response = await fetch(
      `${API_BASE_URL}/trending/movie/${timeWindow}?api_key=${apiKey}`
    );

    if (!response.ok) throw new Error(`Failed to fetch ${timeWindow} trending movies`);

    const data = await response.json();
    return formatMovies(data.results || []).slice(0, 10);
  } catch (error) {
    console.error(`Error fetching ${timeWindow} trending movies:`, error);
    return [];
  }
};

export const getDailyTrendingMovies = () => getTrendingMovies('day');

export const getWeeklyTrendingMovies = () => getTrendingMovies('week');

export const getMovieTrailer = async (movieId) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey || !movieId) return null;

    const response = await fetch(`${API_BASE_URL}/movie/${movieId}/videos?api_key=${apiKey}`);
    if (!response.ok) throw new Error('Failed to fetch movie trailer');

    const data = await response.json();
    const trailer = (data.results || []).find(video =>
      video.site === 'YouTube' && video.type === 'Trailer'
    ) || (data.results || []).find(video => video.site === 'YouTube');

    return trailer?.key || null;
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return null;
  }
};

// Format movie object from TMDB API response
const formatMovie = (movie) => ({
  id: movie.id,
  title: movie.title,
  poster_path: movie.poster_path,
  backdrop_path: movie.backdrop_path,
  release_date: movie.release_date || '',
  overview: movie.overview || '',
  rating: movie.vote_average || 0,
  poster: movie.poster_path ? `${POSTER_BASE_URL}${movie.poster_path}` : null,
  backdrop: movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : null,
  year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
  genre_ids: movie.genre_ids || movie.genres?.map(genre => genre.id) || [],
  genres: (movie.genre_ids || movie.genres?.map(genre => genre.id) || [])
    .map(id => GENRE_MAP[id])
    .filter(Boolean),
});

// Format array of movies
const formatMovies = (movies) => {
  return movies
    .filter(movie => movie.poster_path && movie.title)
    .map(formatMovie)
    .slice(0, 20);
};

export default {
  searchMovies,
  getMovieDetails,
  getMovieFullDetails,
  discoverMoviesByGenres,
  getMovieCatalog,
  getPopularMovies,
  getTopRatedMovies,
  getDailyTrendingMovies,
  getWeeklyTrendingMovies,
  getMovieTrailer,
  GENRE_MAP,
};
