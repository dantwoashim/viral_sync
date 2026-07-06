import { CivicHome } from '@/components/civic/CivicExperience';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export default function HomePage() {
  return <CivicHome market={getFeaturedCivicMarket()} />;
}
