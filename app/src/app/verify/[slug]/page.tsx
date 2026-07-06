import { notFound } from 'next/navigation';
import { CivicVerifyPage } from '@/components/civic/CivicExperience';
import { getCivicMarket } from '@/lib/civic/civicMarket';
import { verifyCivicParticipationPass } from '@/lib/civic/participationPass';

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ pass?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) notFound();
  const initialVerification = query?.pass ? verifyCivicParticipationPass(query.pass, market.slug) : undefined;
  return <CivicVerifyPage market={market} passToken={query?.pass} initialVerification={initialVerification} />;
}
