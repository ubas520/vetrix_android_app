import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { buildPetRetrievalUrl } from '../utils/petQr';

export default function PetQRCode({ token, petName = 'Pet', small = false }) {
  const url = buildPetRetrievalUrl(token);

  if (!url) return null;

  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Scannable QR code for ${petName}'s Vetrix web record`}
        testID="pet-retrieval-qr"
        style={styles.code}>
        <QRCode value={url} size={small ? 200 : 220} quietZone={36} ecl="M" color="#000000" backgroundColor="#ffffff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  code: { backgroundColor: '#ffffff', padding: 2, borderRadius: 8 },
});
