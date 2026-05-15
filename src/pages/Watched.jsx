import React from 'react';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import UserInsights from '../components/UserInsights';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const Watched = () => {
  const { movies } = useMovies();
  const watchedMovies = movies.filter(movie => movie.watched);

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header">
            <h2>İzlenen Filmler</h2>
            <p>{watchedMovies.length} film izlediniz</p>
          </div>
          <UserInsights />
          <MovieList movies={watchedMovies} />
        </div>
      </div>
    </div>
  );
};

export default Watched;
