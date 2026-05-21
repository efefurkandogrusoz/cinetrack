export const getDateTime = (value) => {
  if (!value) return 0;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value?.toDate === 'function') {
    const time = value.toDate().getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;

    if (typeof seconds === 'number') {
      return (seconds * 1000) + Math.floor(nanoseconds / 1000000);
    }
  }

  return 0;
};

export const isWithinDays = (value, days, referenceDate = new Date()) => {
  const time = getDateTime(value);
  if (!time) return false;

  const ref = referenceDate.getTime();
  const start = ref - (days * 24 * 60 * 60 * 1000);
  return time >= start && time <= ref;
};

export const startOfWeek = (referenceDate = new Date()) => {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);
  return date;
};
