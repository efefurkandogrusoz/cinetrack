import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const Settings = () => {
  const { theme, themeOptions, setTheme } = useMovies();

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid settings-page">
          <div className="page-header settings-header">
            <p className="eyebrow">Ayarlar</p>
            <h2>Uygulama Ayarları</h2>
            <p>İlk ayarın tema: CineTrack arayüzünün vurgu rengini buradan değiştirebilirsin.</p>
          </div>

          <section className="settings-section" aria-labelledby="theme-settings-title">
            <div className="settings-section-head">
              <div>
                <p className="eyebrow">Tema</p>
                <h3 id="theme-settings-title">Renk temasını seç</h3>
              </div>
              <span>{themeOptions.length} tema</span>
            </div>

            <div className="theme-grid">
              {themeOptions.map(option => (
                <button
                  key={option.id}
                  className={theme === option.id ? 'theme-card active' : 'theme-card'}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={theme === option.id}
                >
                  <span className="theme-swatch" style={{ backgroundColor: option.color }} />
                  <span className="theme-copy">
                    <strong>{option.name}</strong>
                    <small>{theme === option.id ? 'Seçili tema' : 'Temayı uygula'}</small>
                  </span>
                  <span className="theme-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
