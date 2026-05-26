export const MAX_COMMENT_LENGTH = 500;
export const MIN_COMMENT_LENGTH = 10;
export const MIN_COMMENT_WORDS = 3;

export const getCommentValidationMessage = (text) => {
  const cleanText = text.trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  if (cleanText.length < MIN_COMMENT_LENGTH || wordCount < MIN_COMMENT_WORDS) {
    return 'Yorum en az 10 karakter ve 3 kelime olmalı.';
  }

  if (cleanText.length > MAX_COMMENT_LENGTH) return 'Yorum en fazla 500 karakter olabilir.';
  return '';
};

export const formatCommentDate = (value) => {
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : value
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) return 'Az önce';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const isCommentEdited = (comment) => Boolean(comment?.isEdited || comment?.editedAt);
