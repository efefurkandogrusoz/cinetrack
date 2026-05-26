import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Trash2, XCircle } from 'lucide-react';
import SpoilerContent from '../../components/SpoilerContent';
import {
  deleteReportedComment,
  subscribeAdminReports,
  updateReportStatus,
} from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

const statusLabels = {
  pending: 'Beklemede',
  resolved: 'Çözüldü',
  rejected: 'Reddedildi',
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAdminReports(
      (nextReports) => {
        setReports(nextReports);
        setLoading(false);
      },
      () => {
        setError('Şikayetler yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredReports = useMemo(() => (
    filter === 'all' ? reports : reports.filter(report => report.status === filter)
  ), [filter, reports]);

  const setStatus = async (reportId, status) => {
    setBusyId(reportId);
    setError('');
    try {
      await updateReportStatus(reportId, status);
    } catch {
      setError('Şikayet durumu güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const deleteCommentFromReport = async (report) => {
    if (!window.confirm('Şikayet edilen yorumu kalıcı olarak silmek istediğine emin misin?')) return;

    setBusyId(report.id);
    setError('');
    try {
      await deleteReportedComment(report);
      await updateReportStatus(report.id, 'resolved');
    } catch {
      setError('Yorum silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Moderasyon</p>
          <h2>Şikayetler</h2>
        </div>
        <span className="admin-count-pill">{reports.length}</span>
      </div>

      <div className="admin-filter-tabs">
        {['pending', 'resolved', 'rejected', 'all'].map(status => (
          <button
            key={status}
            className={filter === status ? 'active' : ''}
            type="button"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'Tümü' : statusLabels[status]}
          </button>
        ))}
      </div>

      {error && <p className="admin-alert">{error}</p>}

      {loading ? (
        <p className="admin-empty">Şikayetler yükleniyor...</p>
      ) : filteredReports.length === 0 ? (
        <p className="admin-empty">Bu filtrede şikayet yok.</p>
      ) : (
        <div className="admin-report-list">
          {filteredReports.map(report => (
            <article className="admin-report-card" key={report.id}>
              <div className="admin-report-head">
                <div>
                  <strong>{report.reason}</strong>
                  <span>{formatAdminDate(report.createdAt)}</span>
                </div>
                <span className={`admin-status ${report.status || 'pending'}`}>
                  {statusLabels[report.status] || 'Beklemede'}
                </span>
              </div>

              <div className="admin-report-meta">
                <span>
                  Şikayet eden:
                  <Link to={`/user/${report.reporterUserId}`}>{report.reporterUsername || 'Kullanıcı'}</Link>
                </span>
                <span>
                  Şikayet edilen:
                  <Link to={`/user/${report.reportedUserId}`}>{report.reportedUsername || 'Kullanıcı'}</Link>
                </span>
                <span>{report.commentMediaTitle || 'İsimsiz içerik'}</span>
              </div>

              {report.description && (
                <p className="admin-report-description">{report.description}</p>
              )}

              <SpoilerContent text={report.commentText || 'Yorum metni yok.'} isSpoiler={report.isSpoiler === true} />

              <div className="admin-row-actions">
                <button type="button" onClick={() => deleteCommentFromReport(report)} disabled={busyId === report.id}>
                  <Trash2 size={15} aria-hidden="true" />
                  Yorumu sil
                </button>
                <button type="button" onClick={() => setStatus(report.id, 'resolved')} disabled={busyId === report.id}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Çözüldü
                </button>
                <button type="button" onClick={() => setStatus(report.id, 'rejected')} disabled={busyId === report.id}>
                  <XCircle size={15} aria-hidden="true" />
                  Reddet
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
