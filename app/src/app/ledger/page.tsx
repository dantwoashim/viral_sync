import { CivicLedgerPage } from '@/components/civic/CivicExperience';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export default function LedgerPage() {
  return <CivicLedgerPage market={getFeaturedCivicMarket()} />;
}
