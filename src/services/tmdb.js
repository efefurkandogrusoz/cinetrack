// TMDB API Service
// Configure your TMDB API key in environment variables
// VITE_TMDB_API_KEY=your_api_key_here

const API_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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
  80: 'Suc',
  99: 'Belgesel',
  878: 'Bilim Kurgu',
  9648: 'Gizem',
  10402: 'Muzik',
  10749: 'Romantik',
  10751: 'Aile',
  10752: 'Savas',
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
  release_date: movie.release_date || '',
  overview: movie.overview || '',
  rating: movie.vote_average || 0,
  poster: movie.poster_path ? `${POSTER_BASE_URL}${movie.poster_path}` : null,
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
  discoverMoviesByGenres,
  getPopularMovies,
  getTopRatedMovies,
  getMovieTrailer,
  GENRE_MAP,
};
