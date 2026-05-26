import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Pencil, Trash2 } from 'lucide-react';
import {
  deleteAnnouncement,
  saveAnnouncement,
  subscribeAnnouncements,
} from '../../services/adminService';
import { useNotifications } from '../../context/NotificationContext';
import {
  announcementTypeLabels,
  targetAudienceLabels,
  toDateInputValue,
} from '../../utils/adminContent';
import { formatAdminDate } from '../../utils/admin';

const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  targetAudience: 'all',
  startDate: '',
  endDate: '',
  isActive: true,
  showInNotifications: true,
};

const AdminAnnouncements = () => {
  const { showToast } = useNotifications();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements(
      (items) => {
        setAnnouncements(items);
        setLoading(false);
      },
      () => {
        setError('Duyurular yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const activeCount = useMemo(
    () => announcements.filter(item => item.isActive !== false).length,
    [announcements],
  );

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const editAnnouncement = (announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title || '',
      message: announcement.message || '',
      type: announcement.type || 'info',
      targetAudience: announcement.targetAudience || 'all',
      startDate: toDateInputValue(announcement.startDate),
      endDate: toDateInputValue(announcement.endDate),
      isActive: announcement.isActive !== false,
      showInNotifications: announcement.showInNotifications === true,
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      setError('Başlık ve açıklama zorunlu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveAnnouncement(form, editingId || null);
      showToast(editingId ? 'Duyuru güncellendi.' : 'Duyuru oluşturuldu.', 'success');
      resetForm();
    } catch {
      setError('Duyuru kaydedilemedi.');
      showToast('Duyuru kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeAnnouncement = async (announcementId) => {
    if (!window.confirm('Bu duyuruyu silmek istiyor musun?')) return;

    setError('');
    try {
      await deleteAnnouncement(announcementId);
      showToast('Duyuru silindi.', 'success');
      if (editingId === announcementId) resetForm();
    } catch {
      setError('Duyuru silinemedi.');
      showToast('Duyuru silinemedi.', 'error');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">İletişim</p>
          <h2>Duyurular</h2>
        </div>
        <span className="admin-count-pill">{activeCount} aktif</span>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <form className="admin-form-grid" onSubmit={submit}>
        <label>
          <span>Duyuru başlığı</span>
          <input value={form.title} onChange={event => updateField('title', event.target.value)} maxLength={90} />
        </label>
        <label className="admin-field-wide">
          <span>Duyuru açıklaması</span>
          <textarea value={form.message} onChange={event => updateField('message', event.target.value)} maxLength={360} />
        </label>
        <label>
          <span>Duyuru tipi</span>
          <select value={form.type} onChange={event => updateField('type', event.target.value)}>
            {Object.entries(announcementTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Hedef kitle</span>
          <select value={form.targetAudience} onChange={event => updateField('targetAudience', event.target.value)}>
            {Object.entries(targetAudienceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
        <label className="admin-toggle">
          <input type="checkbox" checked={form.showInNotifications} onChange={event => updateField('showInNotifications', event.target.checked)} />
          Bildirim panelinde göster
        </label>
        <div className="admin-form-actions">
          <button type="submit" disabled={saving}>
            <Megaphone size={15} aria-hidden="true" />
            {editingId ? 'Duyuruyu Güncelle' : 'Duyuru Oluştur'}
          </button>
          {editingId && <button type="button" onClick={resetForm}>Vazgeç</button>}
        </div>
      </form>

      {loading ? (
        <p className="admin-empty">Duyurular yükleniyor...</p>
      ) : announcements.length === 0 ? (
        <p className="admin-empty">Henüz duyuru yok.</p>
      ) : (
        <div className="admin-card-list">
          {announcements.map(announcement => (
            <article className="admin-management-card" key={announcement.id}>
              <div>
                <span className={`admin-status ${announcement.isActive !== false ? 'resolved' : 'rejected'}`}>
                  {announcement.isActive !== false ? 'Aktif' : 'Pasif'}
                </span>
                <span className="admin-role-badge">{announcementTypeLabels[announcement.type] || 'Bilgi'}</span>
              </div>
              <h3>{announcement.title}</h3>
              <p>{announcement.message}</p>
              <small>
                {targetAudienceLabels[announcement.targetAudience] || 'Tüm kullanıcılar'} · {formatAdminDate(announcement.createdAt)}
              </small>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editAnnouncement(announcement)}>
                  <Pencil size={15} aria-hidden="true" />
                  Düzenle
                </button>
                <button type="button" onClick={() => removeAnnouncement(announcement.id)}>
                  <Trash2 size={15} aria-hidden="true" />
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
