export const buildSharePayload = (movie, baseUrl = window.location.origin + (import.meta.env.BASE_URL || '/')) => {
  const title = movie?.title || 'İçerik';
  const mediaType = movie?.mediaType === 'tv' ? 'dizi' : 'film';
  const path = window.location.pathname.includes('movies') ? window.location.pathname : '/';
  const url = `${baseUrl.replace(/\/$/, '')}${path}?share=${encodeURIComponent(movie?.id || title)}`;
  const text = `Bence bunu izlemelisin: ${title}`;
  const fullText = `Film/Dizi Takip uygulamamda sana ${title} öneriyorum.\n${text}\n${url}`;

  return { title, mediaType, text, url, fullText };
};

export const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
};

export const shareContent = async (payload) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { method: 'native', success: true };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { method: 'native', success: false, cancelled: true };
      }
    }
  }

  const copied = await copyText(payload.fullText);
  return { method: 'clipboard', success: copied };
};
