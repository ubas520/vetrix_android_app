import { buildWebsiteUrl } from '../api/config';

export function buildPetRetrievalUrl(token) {
  const normalizedToken = typeof token === 'string' ? token.trim() : '';
  if (!normalizedToken) return '';
  return buildWebsiteUrl(`qr.php?token=${encodeURIComponent(normalizedToken)}`);
}
