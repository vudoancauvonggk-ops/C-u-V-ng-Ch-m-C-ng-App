export const getAccurateCurrentPosition = (
  onSuccess: (pos: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError | {message: string}) => void,
  options: { timeout?: number, desiredAccuracy?: number } = {}
) => {
  if (!navigator.geolocation) {
    onError({ message: 'Trình duyệt không hỗ trợ GPS' });
    return;
  }
  
  let watchId: number;
  let timerId: any;
  let bestPos: GeolocationPosition | null = null;
  
  const timeout = options.timeout || 15000; // wait up to 15s for good GPS
  const desiredAccuracy = options.desiredAccuracy || 50; // want 50 meters or better
  
  const cleanup = () => {
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    if (timerId !== undefined) clearTimeout(timerId);
  };
  
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
        bestPos = pos;
      }
      if (bestPos.coords.accuracy <= desiredAccuracy) {
        cleanup();
        onSuccess(bestPos);
      }
    },
    (err) => {
      if (!bestPos) {
        // don't error out immediately, let the timeout handle it if we have no pos
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
  
  timerId = setTimeout(() => {
    cleanup();
    if (bestPos) {
      onSuccess(bestPos);
    } else {
      onError({ message: 'Không thể lấy GPS chính xác. Hãy ra ngoài trời hoặc bật 4G/Wifi!' });
    }
  }, timeout);
};
