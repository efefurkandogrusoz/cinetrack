import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Search, Trash2, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  deleteHeroBanner,
  saveHeroBanner,
  subscribeHeroBanners,
} from '../../services/adminService';
import { searchMedia } from '../../services/tmdb';
import {
  isWithinDateRange,
  toDateInputValue,
} from '../../utils/adminContent';
import { formatAdminDate } from '../../utils/admin';

const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const DEFAULT_HERO_TITLE = 'Film ve Dizilerini Takip Et';
const DEFAULT_HERO_DESCRIPTION = 'Favorilerini kaydet, izlediklerini işaretle, puan ver ve yeni içerikler keşfet.';

const emptyForm = {
  title: '',
  description: '',
  imageUrl: '',
  posterUrl: '',
  buttonText: 'Keşfet',
  buttonLink: '#discover',
  featuredContentId: '',
  featuredContentType: 'movie',
  featuredContentTitle: '',
  featuredContentYear: '',
  isActive: true,
  startDate: '',
  endDate: '',
};

const getMediaTypeLabel = (mediaType) => (mediaType === 'tv' ? 'Dizi' : 'Film');

const getImageUrl = (value, baseUrl) => {
  if (!value) return '';
  if (String(value).startsWith('http')) return value;
  return `${baseUrl}${value}`;
};

const getMediaImages = (media = {}) => ({
  posterUrl: media.poster || getImageUrl(media.posterPath || media.poster_path, POSTER_BASE_URL),
  backdropUrl: media.backdrop || getImageUrl(media.backdropPath || media.backdrop_path, BACKDROP_BASE_URL),
});

const getMediaTitle = (media = {}) => media.title || media.name || media.originalTitle || media.originalName || 'İsimsiz içerik';

const getMediaYear = (media = {}) => {
  if (media.year && media.year !== 'N/A') return String(media.year);
  const date = media.releaseDate || media.release_date || media.firstAirDate || media.first_air_date || '';
  return date ? String(date).slice(0, 4) : '';
};

const AdminHeroBanners = () => {
  const { showToast } = useNotifications();
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeHeroBanners(
      (items) => {
        setBanners(items);
        setLoading(false);
      },
      () => {
        setError('Hero banner kayıtları yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const activeBanner = useMemo(
    () => banners.find(item => item.isActive !== false && isWithinDateRange(item)),
    [banners],
  );

  const preview = useMemo(() => ({
    title: form.featuredContentTitle,
    year: form.featuredContentYear,
    type: form.featuredContentType,
    posterUrl: form.posterUrl || form.imageUrl,
    backdropUrl: form.imageUrl || form.posterUrl,
  }), [form.featuredContentTitle, form.featuredContentType, form.featuredContentYear, form.imageUrl, form.posterUrl]);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSelectedMedia = () => {
    setForm(current => ({
      ...current,
      imageUrl: '',
      posterUrl: '',
      featuredContentId: '',
      featuredContentType: 'movie',
      featuredContentTitle: '',
      featuredContentYear: '',
    }));
    setSearchResults([]);
    showToast('Hero görselleri varsayılana döndürüldü.', 'info');
  };

  const editBanner = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      posterUrl: banner.posterUrl || banner.posterImageUrl || '',
      buttonText: banner.buttonText || 'Keşfet',
      buttonLink: banner.buttonLink || '#discover',
      featuredContentId: banner.featuredContentId || '',
      featuredContentType: banner.featuredContentType || 'movie',
      featuredContentTitle: banner.featuredContentTitle || '',
      featuredContentYear: banner.featuredContentYear || '',
      isActive: banner.isActive !== false,
      startDate: toDateInputValue(banner.startDate),
      endDate: toDateInputValue(banner.endDate),
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const searchContent = async (event) => {
    event?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    try {
      setSearchResults(await searchMedia(searchQuery, searchType));
    } catch {
      setError('Film veya dizi araması yapılamadı.');
      showToast('Film veya dizi araması yapılamadı.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const selectMedia = (media) => {
    const mediaType = media.mediaType || media.media_type || 'movie';
    const title = getMediaTitle(media);
    const year = getMediaYear(media);
    const { posterUrl, backdropUrl } = getMediaImages(media);

    setForm(current => ({
      ...current,
      imageUrl: backdropUrl || posterUrl || '',
      posterUrl: posterUrl || backdropUrl || '',
      featuredContentId: String(media.id || ''),
      featuredContentType: mediaType,
      featuredContentTitle: title,
      featuredContentYear: year,
    }));
    showToast(`${title} görselleri seçildi.`, 'success');
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    try {
      await saveHeroBanner(form, editingId || null);
      showToast(editingId ? 'Hero banner güncellendi.' : 'Hero banner oluşturuldu.', 'success');
      resetForm();
    } catch {
      setError('Hero banner kaydedilemedi.');
      showToast('Hero banner kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async (bannerId) => {
    if (!window.confirm('Bu hero banner kaydını silmek istiyor musun?')) return;

    setError('');
    try {
      await deleteHeroBanner(bannerId);
      showToast('Hero banner silindi.', 'success');
      if (editingId === bannerId) resetForm();
    } catch {
      setError('Hero banner silinemedi.');
      showToast('Hero banner silinemedi.', 'error');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Ana Sayfa</p>
          <h2>Hero Banner Yönetimi</h2>
        </div>
        <span className="admin-count-pill">{activeBanner ? 'Aktif banner var' : 'Varsayılan hero'}</span>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <form className="admin-form-grid" onSubmit={submit}>
        <label>
          <span>Hero başlığı</span>
          <input
            value={form.title}
            onChange={event => updateField('title', event.target.value)}
            maxLength={90}
            placeholder="Boşsa varsayılan başlık kullanılır"
          />
        </label>
        <label>
          <span>Arka plan görsel URL'si</span>
          <input value={form.imageUrl} onChange={event => updateField('imageUrl', event.target.value)} placeholder="Arama sonucu otomatik doldurur" />
        </label>
        <label className="admin-field-wide">
          <span>Hero açıklaması</span>
          <textarea
            value={form.description}
            onChange={event => updateField('description', event.target.value)}
            maxLength={260}
            placeholder="Boşsa varsayılan açıklama kullanılır"
          />
        </label>
        <label>
          <span>Buton metni</span>
          <input value={form.buttonText} onChange={event => updateField('buttonText', event.target.value)} maxLength={28} />
        </label>
        <label>
          <span>Buton linki</span>
          <input value={form.buttonLink} onChange={event => updateField('buttonLink', event.target.value)} placeholder="/movies, #discover veya #my-list" />
        </label>
        <label>
          <span>Sağ poster/kart görsel URL'si</span>
          <input value={form.posterUrl} onChange={event => updateField('posterUrl', event.target.value)} placeholder="Arama sonucu otomatik doldurur" />
        </label>
        <label>
          <span>Başlangıç tarihi</span>
          <input type="datetime-local" value={form.startDate} onChange={event => updateField('startDate', event.target.value)} />
        </label>
        <label>
          <span>Bitiş tarihi</span>
          <input type="datetime-local" value={form.endDate} onChange={event => updateField('endDate', event.target.value)} />
        </label>
        <label className="admin-toggle">
          <input type="checkbox" checked={form.isActive} onChange={event => updateField('isActive', event.target.checked)} />
          Aktif
        </label>

        <section className="admin-hero-media-picker admin-field-wide">
          <div className="admin-hero-picker-head">
            <div>
              <h3>Film / dizi görseli seç</h3>
              <p>Seçim sadece hero görsellerini ve içerik ID'sini günceller; başlık, açıklama ve butonlar aynı kalır.</p>
            </div>
            <button type="button" onClick={clearSelectedMedia}>
              <X size={15} aria-hidden="true" />
              Varsayılan hero
            </button>
          </div>

          <div className="admin-hero-search-row">
            <label>
              <span>Tür</span>
              <select value={searchType} onChange={event => setSearchType(event.target.value)}>
                <option value="all">Film ve dizi</option>
                <option value="movie">Film</option>
                <option value="tv">Dizi</option>
              </select>
            </label>
            <label>
              <span>İçerik ara</span>
              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') searchContent(event);
                }}
                placeholder="Film veya dizi adı yaz"
              />
            </label>
            <button type="button" onClick={searchContent} disabled={searching || !searchQuery.trim()}>
              <Search size={15} aria-hidden="true" />
              {searching ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="admin-hero-results" aria-label="Film ve dizi arama sonuçları">
              {searchResults.map(media => {
                const mediaType = media.mediaType || media.media_type || 'movie';
                const { posterUrl } = getMediaImages(media);
                const title = getMediaTitle(media);
                const year = getMediaYear(media);
                const selected = form.featuredContentId === String(media.id) && form.featuredContentType === mediaType;

                return (
                  <button
                    key={`${mediaType}:${media.id}`}
                    type="button"
                    className={selected ? 'admin-hero-result selected' : 'admin-hero-result'}
                    onClick={() => selectMedia(media)}
                  >
                    <span className="admin-hero-result-poster">
                      {posterUrl ? <img src={posterUrl} alt="" /> : <span>Poster yok</span>}
                    </span>
                    <span className="admin-hero-result-copy">
                      <strong>{title}</strong>
                      <small>{getMediaTypeLabel(mediaType)}{year ? ` · ${year}` : ''}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="admin-hero-preview">
            <div className="admin-hero-preview-backdrop">
              {preview.backdropUrl ? <img src={preview.backdropUrl} alt="" /> : <span>Varsayılan arka plan</span>}
            </div>
            <div className="admin-hero-preview-poster">
              {preview.posterUrl ? <img src={preview.posterUrl} alt="" /> : <span>Varsayılan poster</span>}
            </div>
            <div className="admin-hero-preview-copy">
              <span>Seçilen içerik</span>
              <strong>{preview.title || 'Varsayılan hero görselleri'}</strong>
              <small>
                {form.featuredContentId
                  ? `${getMediaTypeLabel(preview.type)} · ID ${form.featuredContentId}${preview.year ? ` · ${preview.year}` : ''}`
                  : 'Film/dizi seçilmediğinde ana sayfa varsayılan görselleri kullanır.'}
              </small>
            </div>
          </div>
        </section>

        <div className="admin-form-actions">
          <button type="submit" disabled={saving}>
            <ImagePlus size={15} aria-hidden="true" />
            {editingId ? 'Banner Güncelle' : 'Banner Oluştur'}
          </button>
          {editingId && <button type="button" onClick={resetForm}>Vazgeç</button>}
        </div>
      </form>

      {loading ? (
        <p className="admin-empty">Banner kayıtları yükleniyor...</p>
      ) : banners.length === 0 ? (
        <p className="admin-empty">Henüz hero banner yok. Ana sayfa varsayılan hero ile devam eder.</p>
      ) : (
        <div className="admin-card-list">
          {banners.map(banner => (
            <article className="admin-management-card hero" key={banner.id}>
              <div className="admin-banner-thumb">
                {banner.imageUrl ? <img src={banner.imageUrl} alt="" /> : <span>Varsayılan görsel</span>}
              </div>
              <div>
                <span className={`admin-status ${banner.isActive !== false && isWithinDateRange(banner) ? 'resolved' : 'rejected'}`}>
                  {banner.isActive !== false && isWithinDateRange(banner) ? 'Aktif' : 'Pasif'}
                </span>
                <h3>{banner.title || DEFAULT_HERO_TITLE}</h3>
                <p>{banner.description || DEFAULT_HERO_DESCRIPTION}</p>
                <small>
                  {banner.featuredContentTitle
                    ? `${banner.featuredContentTitle} · ${getMediaTypeLabel(banner.featuredContentType)} · ${formatAdminDate(banner.createdAt)}`
                    : formatAdminDate(banner.createdAt)}
                </small>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => editBanner(banner)}>
                    <Pencil size={15} aria-hidden="true" />
                    Düzenle
                  </button>
                  <button type="button" onClick={() => removeBanner(banner.id)}>
                    <Trash2 size={15} aria-hidden="true" />
                    Sil
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHeroBanners;
