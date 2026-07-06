import { SponsorPage } from '@/components/civic/CivicExperience';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export default function ForSponsorsPage() {
  return <SponsorPage market={getFeaturedCivicMarket()} />;
}
