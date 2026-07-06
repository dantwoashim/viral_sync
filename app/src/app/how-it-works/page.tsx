import { HowItWorksPage } from '@/components/civic/CivicExperience';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export default function HowItWorksRoute() {
  return <HowItWorksPage market={getFeaturedCivicMarket()} />;
}
