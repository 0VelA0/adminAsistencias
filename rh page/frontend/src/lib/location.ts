export const getLocation = (): Promise<{ latitude: number; longitude: number; accuracy_meters: number }> => new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_meters: position.coords.accuracy }), error => reject(error), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
})
