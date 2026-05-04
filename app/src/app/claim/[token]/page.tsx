import { notFound } from 'next/navigation';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { ProductClaimFlow } from '@/components/product/ProductClaimFlow';
import { defaultProductLoopCampaign, findProductLoopCampaign } from '@/lib/product-loop/productLoop';

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);
  const campaign = findProductLoopCampaign(decodedToken) ?? defaultProductLoopCampaign();
  if (!campaign?.proofBacked) notFound();

  return (
    <PremiumShell className="claim-page">
      <PremiumNav />
      <ProductClaimFlow campaign={campaign} token={decodedToken || campaign.slug} />
    </PremiumShell>
  );
}
