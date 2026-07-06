import { notFound } from 'next/navigation';
import { CivicParticipationPage } from '@/components/civic/CivicExperience';
import { getCivicMarket } from '@/lib/civic/civicMarket';

export default async function ParticipatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) notFound();
  return <CivicParticipationPage market={market} />;
}
