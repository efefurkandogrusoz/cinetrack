/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import * as firebaseService from '../services/firebase';
import * as storageService from '../services/storage';

export const MovieContext = createContext();

export const themeOptions = [
  { id: 'crimson', name: 'Klasik Kırmızı', color: '#e50914' },
  { id: 'amber', name: 'Altın Sarısı', color: '#f5b301' },
  { id: 'emerald', name: 'Zümrüt Yeşili', color: '#20c997' },
  { id: 'sapphire', name: 'Sinematik Mavi', color: '#3b82f6' },
  { id: 'violet', name: 'Gece Moru', color: '#8b5cf6' },
  { id: 'rose', name: 'Neon Pembe', color: '#f43f5e' },
];

const defaultTheme = 'crimson';

const getStoredTheme = () => {
  if (typeof window === 'undefined') return defaultTheme;

  const storedTheme = window.localStorage.getItem('cinetrack-theme');
  return themeOptions.some(theme => theme.id === storedTheme) ? storedTheme : defaultTheme;
};

const initialState = {
  movies: [],
  filter: 'all', // 'all', 'watched', 'watchlist'
  searchResults: [],
  loading: false,
  error: null,
  user: null,
  userProfile: null,
  authReady: false,
  theme: getStoredTheme(),
};

const movieReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MOVIES':
      return { ...state, movies: action.payload, error: null };
    
    case 'ADD_MOVIE':
      if (state.movies.some(movie => movie.id === action.payload.id)) {
        return state;
      }
      return { ...state, movies: [...state.movies, action.payload] };
    
    case 'DELETE_MOVIE':
      return {
        ...state,
        movies: state.movies.filter(m => m.docId !== action.payload),
      };
    
    case 'UPDATE_MOVIE':
      return {
        ...state,
        movies: state.movies.map(m =>
          m.docId === action.payload.docId ? { ...m, ...action.payload } : m
        ),
      };
    
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };

    case 'SET_AUTH_READY':
      return { ...state, authReady: action.payload };

    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
};

export const MovieProvider = ({ children }) => {
  const [state, dispatch] = useReducer(movieReducer, initialState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    window.localStorage.setItem('cinetrack-theme', state.theme);
  }, [state.theme]);

  const loadMovies = useCallback(async (useFirebase = Boolean(firebaseService.auth.currentUser)) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!useFirebase) {
        dispatch({ type: 'SET_MOVIES', payload: [] });
        return;
      }

      const user = firebaseService.auth.currentUser;
      if (!user) {
        dispatch({ type: 'SET_MOVIES', payload: [] });
        return;
      }

      // Try to get from Firebase first
      const firebaseMovies = await firebaseService.getAllMovies();

      // Sync with local storage
      const syncedMovies = await storageService.syncWithFirebase(firebaseMovies, user.uid);

      dispatch({ type: 'SET_MOVIES', payload: syncedMovies });
    } catch (error) {
      console.error('Error loading movies:', error);
      // Fallback to local storage
      const localMovies = storageService.getMoviesFromLocal(firebaseService.auth.currentUser?.uid);
      dispatch({ type: 'SET_MOVIES', payload: localMovies });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with server, using local data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load movies on mount
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = firebaseService.onUserStateChanged((user) => {
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_AUTH_READY', payload: true });

      if (user) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
            profileNote: '',
          },
        });

        firebaseService.getUserProfile(user.uid).then((profile) => {
          if (profile) {
            dispatch({ type: 'SET_USER_PROFILE', payload: profile });
          }
        });

        loadMovies(true);
      } else {
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        loadMovies(false);
      }
    });

    return () => unsubscribe();
  }, [loadMovies]);

  // Sync local storage
  useEffect(() => {
    if (state.user) {
      storageService.saveMoviesToLocal(state.movies, state.user.uid);
    }
  }, [state.movies, state.user]);

  const addMovie = useCallback(async (movieData) => {
    if (state.movies.some(movie => movie.id === movieData.id)) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newMovie = {
        id: movieData.id,
        title: movieData.title,
        poster: movieData.poster,
        poster_path: movieData.poster_path,
        year: movieData.year,
        genre_ids: movieData.genre_ids || [],
        genres: movieData.genres || [],
        backdrop: movieData.backdrop || null,
        backdrop_path: movieData.backdrop_path || null,
        trailerKey: movieData.trailerKey || null,
        runtime: movieData.runtime || null,
        watched: movieData.watched || false,
        favorite: movieData.favorite || false,
        reaction: movieData.reaction || null,
        rating: movieData.rating || 0,
        overview: movieData.overview || '',
      };

      // Try to add to Firebase first
      if (state.user) {
        const result = await firebaseService.addMovie(newMovie);
        dispatch({ type: 'ADD_MOVIE', payload: result });
      } else {
        // Offline: add to local only
        const movieWithDocId = { ...newMovie, docId: `local_${Date.now()}` };
        dispatch({ type: 'ADD_MOVIE', payload: movieWithDocId });
      }
    } catch (error) {
      console.error('Error adding movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const deleteMovie = useCallback(async (docId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (state.user) {
        await firebaseService.deleteMovie(docId);
      }
      dispatch({ type: 'DELETE_MOVIE', payload: docId });
    } catch (error) {
      console.error('Error deleting movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user]);

  const toggleWatched = useCallback(async (docId, currentStatus) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newStatus = !currentStatus;
      if (state.user) {
        await firebaseService.updateMovieStatus(docId, { watched: newStatus });
      }
      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, watched: newStatus } });
    } catch (error) {
      console.error('Error updating movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user]);

  const toggleFavorite = useCallback(async (docId, currentStatus) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newStatus = !currentStatus;
      if (state.user) {
        await firebaseService.updateMovieStatus(docId, { favorite: newStatus });
      }
      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, favorite: newStatus } });
    } catch (error) {
      console.error('Error updating movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user]);

  const setReaction = useCallback(async (docId, reaction) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const movie = state.movies.find(m => (m.docId || m.id) === docId);
      const nextReaction = movie?.reaction === reaction ? null : reaction;
      const updates = { reaction: nextReaction, watched: true };

      if (state.user) {
        await firebaseService.updateMovieStatus(docId, updates);
      }

      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, ...updates } });
    } catch (error) {
      console.error('Error updating reaction:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie reaction' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const setFilter = useCallback((filter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setSearchResults = useCallback((results) => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setTheme = useCallback((themeId) => {
    const nextTheme = themeOptions.some(theme => theme.id === themeId) ? themeId : defaultTheme;
    dispatch({ type: 'SET_THEME', payload: nextTheme });
  }, []);

  const updateAccountSettings = useCallback(async (updates) => {
    const nextProfile = await firebaseService.updateAccountSettings(updates);
    dispatch({ type: 'SET_USER', payload: firebaseService.auth.currentUser });
    dispatch({ type: 'SET_USER_PROFILE', payload: nextProfile });
    return nextProfile;
  }, []);

  const getFilteredMovies = () => {
    switch (state.filter) {
      case 'watched':
        return state.movies.filter(m => m.watched);
      case 'watchlist':
        return state.movies.filter(m => !m.watched);
      case 'favorites':
        return state.movies.filter(m => m.favorite);
      default:
        return state.movies;
    }
  };

  const value = {
    ...state,
    filteredMovies: getFilteredMovies(),
    loadMovies,
    addMovie,
    deleteMovie,
    toggleWatched,
    toggleFavorite,
    setReaction,
    setFilter,
    setSearchResults,
    clearError,
    setTheme,
    themeOptions,
    updateAccountSettings,
  };

  return (
    <MovieContext.Provider value={value}>
      {children}
    </MovieContext.Provider>
  );
};

export const useMovies = () => {
  const context = React.useContext(MovieContext);
  if (!context) {
    throw new Error('useMovies must be used within MovieProvider');
  }
  return context;
};
