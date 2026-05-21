import { useState } from 'react';
import { Flag, Send, X } from 'lucide-react';
import { reportReasons } from '../utils/admin';

const ReportForm = ({ onCancel, onSubmit }) => {
  const [reason, setReason] = useState(reportReasons[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitReport = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await onSubmit(reason, description);
    } catch (submitError) {
      setError(submitError?.message || 'Şikayet gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="report-form" onSubmit={submitReport}>
      <div className="report-form-head">
        <Flag size={15} aria-hidden="true" />
        <strong>Yorumu şikayet et</strong>
      </div>
      <label>
        <span>Neden</span>
        <select value={reason} onChange={event => setReason(event.target.value)}>
          {reportReasons.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>Açıklama</span>
        <textarea
          value={description}
          maxLength={280}
          placeholder="İstersen kısa bir açıklama ekle"
          onChange={event => setDescription(event.target.value)}
        />
      </label>
      <div className="comment-edit-actions">
        <span>{description.length} / 280</span>
        <button type="submit" disabled={busy}>
          <Send size={15} aria-hidden="true" />
          Gönder
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          <X size={15} aria-hidden="true" />
          İptal
        </button>
      </div>
      {error && <p className="comments-message error">{error}</p>}
    </form>
  );
};

export default ReportForm;
