import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import { getWatchStatus } from '../utils/media';
import '../styles/pages/pages.css';

const Watchlist = () => {
  const { movies } = useMovies();
  const watchlistMovies = movies.filter(movie => getWatchStatus(movie) === 'watchlist');

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <h2>İzlenecekler</h2>
            <p>{watchlistMovies.length} film veya dizi izlemeyi bekliyor</p>
          </div>
          <MovieList movies={watchlistMovies} />
        </div>
      </div>
    </div>
  );
};

export default Watchlist;
