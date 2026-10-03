const GOOGLE_MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?';
const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?';

function encodeParameter(value) {
  return encodeURIComponent(value.trim());
}

export function buildGoogleMapsDirectionsUrl({ destination, origin, travelMode = 'driving', useCurrentLocation = false }) {
  const parameters = ['api=1'];

  if (!useCurrentLocation && origin?.trim()) {
    parameters.push(`origin=${encodeParameter(origin)}`);
  }

  parameters.push(`destination=${encodeParameter(destination)}`);
  parameters.push(`travelmode=${encodeParameter(travelMode)}`);
  parameters.push('dir_action=navigate');
  parameters.push('utm_source=vetrix_client');
  parameters.push('utm_campaign=clinic_directions');

  return `${GOOGLE_MAPS_DIRECTIONS_URL}${parameters.join('&')}`;
}

export function buildGoogleMapsSearchUrl(destination) {
  return `${GOOGLE_MAPS_SEARCH_URL}api=1&query=${encodeParameter(destination)}&utm_source=vetrix_client&utm_campaign=clinic_location`;
}
