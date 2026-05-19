import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import { getWatchStatus } from '../utils/media';
import '../styles/pages/pages.css';

const Watched = () => {
  const { movies } = useMovies();
  const watchedMovies = movies.filter(movie => movie.watched || getWatchStatus(movie) === 'completed' || getWatchStatus(movie) === 'watched');

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <h2>İzlenenler</h2>
            <p>{watchedMovies.length} film veya dizi tamamlandı</p>
          </div>
          <MovieList movies={watchedMovies} />
        </div>
      </div>
    </div>
  );
};

export default Watched;
