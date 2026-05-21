import { useState } from 'react';

const SpoilerContent = ({ isSpoiler = false, text }) => {
  const [visible, setVisible] = useState(false);

  if (!isSpoiler) {
    return <p>{text}</p>;
  }

  if (!visible) {
    return (
      <button
        className="spoiler-box spoiler-box-hidden"
        type="button"
        onClick={() => setVisible(true)}
      >
        Bu yorum spoiler içeriyor. Görmek için tıkla.
      </button>
    );
  }

  return (
    <div className="spoiler-box spoiler-box-visible">
      <span className="spoiler-badge">Spoiler</span>
      <p>{text}</p>
      <button type="button" onClick={() => setVisible(false)}>
        Spoileri gizle
      </button>
    </div>
  );
};

export default SpoilerContent;
