let notifyHandler = null;

export const setNotifyHandler = (handler) => {
  notifyHandler = handler;
};

export const notifyFromBridge = (type, title, message, options = {}) => {
  if (typeof notifyHandler === 'function') {
    notifyHandler(type, title, message, options);
  }
};
