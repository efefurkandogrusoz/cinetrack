import { Link2, MessageCircle, Share2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { NOTIFICATION_TYPES } from '../utils/notificationHelpers';
import { buildSharePayload, copyText, shareContent } from '../utils/shareHelpers';
import '../styles/components/FeatureWidgets.css';

const ShareActions = ({ movie }) => {
  const { addNotification, showToast } = useNotifications();

  const handleShare = async () => {
    const payload = buildSharePayload(movie);

    try {
      const result = await shareContent(payload);

      if (result.cancelled) return;

      if (result.success) {
        addNotification(
          NOTIFICATION_TYPES.SHARE,
          result.method === 'native' ? 'Paylaşım başlatıldı' : 'Link Kopyalandı',
          result.method === 'native'
            ? 'Paylaşım ekranı açıldı.'
            : 'Paylaşım metni panoya kopyalandı.',
          { toastVariant: 'success', actionUrl: null },
        );
        return;
      }

      showToast('Link kopyalanamadı.', 'error');
    } catch {
      showToast('Link kopyalanamadı.', 'error');
    }
  };

  const handleCopyLink = async () => {
    const payload = buildSharePayload(movie);

    try {
      const copied = await copyText(payload.fullText);

      if (copied) {
        addNotification(
          NOTIFICATION_TYPES.SHARE,
          'Link Hazır',
          'Arkadaşına önermek için link hazır.',
          { toastVariant: 'success' },
        );
        return;
      }

      showToast('Link kopyalanamadı.', 'error');
    } catch {
      showToast('Link kopyalanamadı.', 'error');
    }
  };

  const handleWhatsAppShare = () => {
    const payload = buildSharePayload(movie);
    const encodedText = encodeURIComponent(payload.fullText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    addNotification(
      NOTIFICATION_TYPES.SHARE,
      'WhatsApp Paylaşımı',
      'WhatsApp paylaşım ekranı açıldı.',
      { toastVariant: 'success', actionUrl: null },
    );
  };

  return (
    <div className="share-actions">
      <div className="share-actions-head">
        <h3>Paylaş:</h3>
        <span>Sade paylaşım</span>
      </div>
      <div className="share-actions-buttons">
        <button type="button" className="share-btn share-btn--whatsapp" onClick={handleWhatsAppShare}>
          <MessageCircle size={16} aria-hidden="true" />
          WhatsApp
        </button>
        <button type="button" className="share-btn" onClick={handleCopyLink}>
          <Link2 size={16} aria-hidden="true" />
          Linki Kopyala
        </button>
        <button type="button" className="share-btn primary" onClick={handleShare}>
          <Share2 size={16} aria-hidden="true" />
          Arkadaşa Öner
        </button>
      </div>
    </div>
  );
};

export default ShareActions;
