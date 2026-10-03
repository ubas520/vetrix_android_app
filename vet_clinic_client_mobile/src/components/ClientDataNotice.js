import { useClientData } from '../context/ClientDataContext';
import ConnectionNotice from './ConnectionNotice';

export default function ClientDataNotice() {
  const { error, refresh, refreshing, loading } = useClientData();
  return <ConnectionNotice error={error} onRetry={refresh} loading={refreshing || loading} />;
}
