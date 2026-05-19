import { useState } from 'react';
import { useMovies } from '../context/MovieContext';
import { getMediaKey } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/ContinueWatching.css';

const ContinueWatching = () => {
  const { advanceEpisode, movies } = useMovies();
  const [selectedShow, setSelectedShow] = useState(null);
  const shows = movies
    .filter(movie => movie.mediaType === 'tv' && movie.watchStatus === 'watching')
    .slice(0, 6);

  if (shows.length === 0) return null;

  return (
    <section className="continue-section" aria-labelledby="continue-title">
      <div className="continue-head">
        <div>
          <h3 id="continue-title">İzlemeye Devam Et</h3>
          <p>İzleniyor durumundaki dizilerin ve kaldığın bölüm bilgileri.</p>
        </div>
        <span>{shows.length} dizi</span>
      </div>

      <div className="continue-grid">
        {shows.map(show => (
          <article className="continue-card" key={show.docId || getMediaKey(show)}>
            <button className="continue-main" type="button" onClick={() => setSelectedShow(show)}>
              <span className="continue-poster">
                {show.poster ? <img src={show.poster} alt={show.title} /> : <span>Poster Yok</span>}
              </span>
              <span className="continue-copy">
                <strong>{show.title}</strong>
                <span>Sezon {show.currentSeason || 1} / Bölüm {show.currentEpisode || 0}</span>
                <small>
                  {show.totalSeasons ? `${show.totalSeasons} sezon` : 'Sezon bilgisi yok'}
                  {show.totalEpisodes ? `, ${show.totalEpisodes} bölüm` : ''}
                </small>
              </span>
            </button>

            <button
              className="continue-next"
              type="button"
              onClick={() => advanceEpisode(show.docId || show.id)}
            >
              Sonraki Bölüm
            </button>
          </article>
        ))}
      </div>

      {selectedShow && <MovieDetailsModal movie={selectedShow} onClose={() => setSelectedShow(null)} />}
    </section>
  );
};

export default ContinueWatching;
