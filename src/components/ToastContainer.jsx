import { useNotifications } from '../context/NotificationContext';
import '../styles/components/ToastContainer.css';

const ToastContainer = () => {
  const { toasts } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-item ${toast.variant}`} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
