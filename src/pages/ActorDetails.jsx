import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Film,
  Image as ImageIcon,
  MapPin,
  Ruler,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import MovieDetailsModal from '../components/MovieDetailsModal';
import Navbar from '../components/Navbar';
import { getPersonDetails } from '../services/tmdb';
import '../styles/pages/pages.css';
import '../styles/pages/ActorDetails.css';

const infoOrFallback = (value) => {
  if (value === 0) return '0';
  if (!value) return 'Bilgi yok';
  return value;
};

const departmentLabels = {
  Acting: 'Oyuncu',
  Directing: 'Yönetmen',
  Writing: 'Yazar',
  Production: 'Yapım',
  Crew: 'Ekip',
  Sound: 'Ses',
  Camera: 'Kamera',
};

const formatDate = (value) => {
  if (!value) return 'Bilgi yok';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bilgi yok';

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const calculateAge = (birthday, deathday) => {
  if (!birthday) return 'Bilgi yok';

  const birthDate = new Date(birthday);
  const endDate = deathday ? new Date(deathday) : new Date();
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Bilgi yok';

  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return deathday ? `${age} (vefat)` : `${age}`;
};

const getDepartmentLabel = (department) => departmentLabels[department] || department || 'Bilgi yok';

const ActorDetails = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const [actorState, setActorState] = useState({
    actor: null,
    actorId: null,
    error: '',
    loading: true,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const actor = actorState.actorId === actorId ? actorState.actor : null;
  const loading = actorState.actorId !== actorId || actorState.loading;
  const error = actorState.actorId === actorId ? actorState.error : '';

  const actorFacts = useMemo(() => ([
    {
      icon: CalendarDays,
      label: 'Yaşı',
      value: calculateAge(actor?.birthday, actor?.deathday),
    },
    {
      icon: CalendarDays,
      label: 'Doğum tarihi',
      value: formatDate(actor?.birthday),
    },
    {
      icon: Ruler,
      label: 'Boyu',
      value: 'Bilgi yok',
    },
    {
      icon: MapPin,
      label: 'Doğum yeri',
      value: infoOrFallback(actor?.placeOfBirth),
    },
    {
      icon: Briefcase,
      label: 'Meslek',
      value: getDepartmentLabel(actor?.knownForDepartment),
    },
    {
      icon: Star,
      label: 'Popülerlik',
      value: actor?.popularity ? Number(actor.popularity).toFixed(1) : 'Bilgi yok',
    },
  ]), [actor]);

  useEffect(() => {
    let cancelled = false;

    getPersonDetails(actorId)
      .then(person => {
        if (cancelled) return;

        if (!person) {
          setActorState({
            actor: null,
            actorId,
            error: 'Oyuncu bilgileri yüklenemedi.',
            loading: false,
          });
          return;
        }

        setActorState({
          actor: person,
          actorId,
          error: '',
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setActorState({
            actor: null,
            actorId,
            error: 'Oyuncu bilgileri yüklenemedi.',
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [actorId]);

  return (
    <div className="page-container actor-page">
      <Navbar />
      <div className="page-content">
        <main className="container-fluid actor-shell">
          <button className="actor-back-btn" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} aria-hidden="true" />
            Geri Dön
          </button>

          {loading ? (
            <section className="actor-state-card">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
              <p>Oyuncu bilgileri yükleniyor...</p>
            </section>
          ) : error ? (
            <section className="actor-state-card">
              <UserRound size={34} aria-hidden="true" />
              <h2>Bilgi bulunamadı</h2>
              <p>{error}</p>
            </section>
          ) : actor && (
            <>
              <section className="actor-hero" aria-labelledby="actor-title">
                <div className="actor-profile-card">
                  {actor.profileUrl ? (
                    <img src={actor.profileUrl} alt={actor.name} />
                  ) : (
                    <span>
                      <UserRound size={44} aria-hidden="true" />
                      Fotoğraf yok
                    </span>
                  )}
                </div>

                <div className="actor-hero-copy">
                  <p className="eyebrow">Oyuncu Detayı</p>
                  <h1 id="actor-title">{actor.name}</h1>
                  <p>{actor.biography || 'Bu oyuncu için biyografi bilgisi yok.'}</p>

                  <div className="actor-fact-grid" aria-label="Oyuncu bilgileri">
                    {actorFacts.map(({ icon: Icon, label, value }) => (
                      <div className="actor-fact-card" key={label}>
                        <span><Icon size={17} aria-hidden="true" /></span>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="actor-section">
                <div className="actor-section-head">
                  <div>
                    <p className="eyebrow">Galeri</p>
                    <h2>Oyuncu Fotoğrafları</h2>
                  </div>
                  <span>{actor.images.length} fotoğraf</span>
                </div>

                {actor.images.length > 0 ? (
                  <div className="actor-gallery-grid">
                    {actor.images.map(image => (
                      <button
                        className="actor-gallery-card"
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                      >
                        <img src={image.url} alt={`${actor.name} fotoğrafı`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="actor-empty-message">Bu oyuncuya ait fotoğraf bulunamadı.</p>
                )}
              </section>

              <section className="actor-section">
                <div className="actor-section-head">
                  <div>
                    <p className="eyebrow">Filmografi</p>
                    <h2>Oynadığı Film ve Diziler</h2>
                  </div>
                  <span>{actor.credits.length} içerik</span>
                </div>

                {actor.credits.length > 0 ? (
                  <div className="actor-credit-grid">
                    {actor.credits.map(credit => (
                      <button
                        className="actor-credit-card"
                        key={`${credit.mediaType}:${credit.id}`}
                        type="button"
                        onClick={() => setSelectedMedia(credit)}
                      >
                        <span className="actor-credit-poster">
                          {credit.poster ? (
                            <img src={credit.poster} alt="" loading="lazy" />
                          ) : (
                            <Film size={26} aria-hidden="true" />
                          )}
                          <em>{credit.mediaType === 'tv' ? 'Dizi' : 'Film'}</em>
                          {Number(credit.rating) > 0 && <strong>★ {Number(credit.rating).toFixed(1)}</strong>}
                        </span>
                        <span className="actor-credit-copy">
                          <b title={credit.title}>{credit.title}</b>
                          <small>{credit.year || 'Yıl yok'}</small>
                          {credit.character && <small title={credit.character}>{credit.character}</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="actor-empty-message">Bu oyuncunun oynadığı içerik bulunamadı.</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedImage && (
        <div className="actor-image-modal" role="dialog" aria-modal="true" aria-label="Oyuncu fotoğrafı">
          <button className="actor-image-backdrop" type="button" onClick={() => setSelectedImage(null)} aria-label="Fotoğrafı kapat" />
          <section className="actor-image-box">
            <button type="button" onClick={() => setSelectedImage(null)} aria-label="Kapat">
              <X size={18} aria-hidden="true" />
            </button>
            {selectedImage.url ? (
              <img src={selectedImage.url} alt={`${actor?.name || 'Oyuncu'} fotoğrafı`} />
            ) : (
              <span>
                <ImageIcon size={34} aria-hidden="true" />
                Fotoğraf yok
              </span>
            )}
          </section>
        </div>
      )}

      {selectedMedia && (
        <MovieDetailsModal movie={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
};

export default ActorDetails;
