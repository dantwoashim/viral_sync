import { notFound } from 'next/navigation';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { MerchantTerminalFlow } from '@/components/product/MerchantTerminalFlow';
import { defaultProductLoopCampaign, findProductLoopCampaign } from '@/lib/product-loop/productLoop';

export default async function MerchantScanPage({
  searchParams,
}: {
  searchParams?: Promise<{ pass?: string; slug?: string; token?: string }>;
}) {
  const query = await searchParams;
  const slug = query?.slug ? decodeURIComponent(query.slug) : undefined;
  const campaign = slug ? findProductLoopCampaign(slug) : defaultProductLoopCampaign();
  if (!campaign?.proofBacked) notFound();

  return (
    <PremiumShell className="terminal-page">
      <PremiumNav />
      <MerchantTerminalFlow
        campaign={campaign}
        initialPassCode={query?.pass ? decodeURIComponent(query.pass) : undefined}
        token={query?.token ? decodeURIComponent(query.token) : campaign.slug}
      />
    </PremiumShell>
  );
}
