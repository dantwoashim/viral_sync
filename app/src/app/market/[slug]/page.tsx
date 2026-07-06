import { notFound } from 'next/navigation';
import { CivicMarketPage } from '@/components/civic/CivicExperience';
import { getCivicMarket } from '@/lib/civic/civicMarket';

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) notFound();
  return <CivicMarketPage market={market} />;
}
