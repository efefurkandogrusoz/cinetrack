import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const MyList = () => {
  const { movies } = useMovies();

  return (
    <div className="page-container my-list-page">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <p className="eyebrow">Listeler</p>
            <h2>Listem</h2>
            <p>{movies.length} kayıtlı film veya dizi, izleme ve favori durumlarıyla birlikte gösteriliyor.</p>
          </div>
          <MovieList movies={movies} listId="my-library-list" />
        </div>
      </div>
    </div>
  );
};

export default MyList;
