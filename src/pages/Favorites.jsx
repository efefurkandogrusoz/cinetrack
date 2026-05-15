import React from 'react';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const Favorites = () => {
  const { movies } = useMovies();
  const favoriteMovies = movies.filter(movie => movie.favorite);

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <h2>Favori Filmler</h2>
            <p>{favoriteMovies.length} favori film var</p>
          </div>
          <MovieList movies={favoriteMovies} />
        </div>
      </div>
    </div>
  );
};

export default Favorites;
