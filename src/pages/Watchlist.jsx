import React from 'react';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const Watchlist = () => {
  const { movies } = useMovies();
  const watchlistMovies = movies.filter(movie => !movie.watched);

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <h2>İzlenecek Filmler</h2>
            <p>{watchlistMovies.length} film izlemeyi bekliyor</p>
          </div>
          <MovieList movies={watchlistMovies} />
        </div>
      </div>
    </div>
  );
};

export default Watchlist;
