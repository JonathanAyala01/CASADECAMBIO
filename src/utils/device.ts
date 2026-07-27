/**
 * Utility for Client Device Identification & Device Lock Security
 */

export const getOrCreateDeviceId = (): string => {
  let devId = localStorage.getItem('cambios_device_id');
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem('cambios_device_id', devId);
  }
  return devId;
};

export const getDeviceDetails = (): { deviceId: string; deviceName: string; userAgent: string } => {
  const deviceId = getOrCreateDeviceId();
  const ua = navigator.userAgent;

  let os = 'Dispositivo Móvil';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iPhone / iOS';
  } else if (/Android/i.test(ua)) {
    os = 'Teléfono Android';
  } else if (/Windows/i.test(ua)) {
    os = 'PC Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'Mac Computer';
  } else if (/Linux/i.test(ua)) {
    os = 'Dispositivo Linux';
  }

  let browser = 'Navegador Web';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  }

  const deviceName = `${os} (${browser})`;

  return {
    deviceId,
    deviceName,
    userAgent: ua,
  };
};
