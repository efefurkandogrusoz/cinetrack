import { useMemo } from 'react';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import { getWatchStatus } from '../utils/media';
import '../styles/pages/pages.css';

const libraryViews = {
  all: {
    title: 'Tüm İçeriklerim',
    eyebrow: 'Liste Özeti',
    description: count => `${count} kayıtlı film veya dizi listeleniyor`,
  },
  watched: {
    title: 'İzlenen İçeriklerim',
    eyebrow: 'Tamamlananlar',
    description: count => `${count} film veya dizi tamamlandı`,
  },
  watchlist: {
    title: 'İzlenecek İçeriklerim',
    eyebrow: 'Planlama Listesi',
    description: count => `${count} film veya dizi izlemeyi bekliyor`,
  },
  favorites: {
    title: 'Favorilerim',
    eyebrow: 'Favoriler',
    description: count => `${count} favori film veya dizi var`,
  },
};

const getLibraryMovies = (movies = [], view = 'all') => {
  switch (view) {
    case 'watched':
      return movies.filter(movie => (
        movie.watched ||
        getWatchStatus(movie) === 'completed' ||
        getWatchStatus(movie) === 'watched'
      ));
    case 'watchlist':
      return movies.filter(movie => getWatchStatus(movie) === 'watchlist');
    case 'favorites':
      return movies.filter(movie => movie.favorite || movie.isFavorite);
    default:
      return movies;
  }
};

const LibraryPage = ({ view = 'all', title = '', description = '' }) => {
  const { movies } = useMovies();
  const pageConfig = libraryViews[view] || libraryViews.all;
  const filteredMovies = useMemo(() => getLibraryMovies(movies, view), [movies, view]);
  const pageTitle = title || pageConfig.title;
  const pageDescription = description || pageConfig.description(filteredMovies.length);

  return (
    <div className="page-container library-page">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <p className="eyebrow">{pageConfig.eyebrow}</p>
            <h2>{pageTitle}</h2>
            <p>{pageDescription}</p>
          </div>
          <MovieList movies={filteredMovies} listId={view === 'all' ? 'all-library-list' : undefined} />
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
