import { notFound } from 'next/navigation';
import { MerchantTerminalFlow } from '@/components/product/MerchantTerminalFlow';
import { defaultProductLoopCampaign, findProductLoopCampaign } from '@/lib/product-loop/productLoop';

export default async function MerchantScanPage({
  searchParams,
}: {
  searchParams?: Promise<{ pass?: string; mac?: string; slug?: string; token?: string; passId?: string; nonce?: string; terminal?: string; merchant?: string }>;
}) {
  const query = await searchParams;
  const slug = query?.slug ? decodeURIComponent(query.slug) : undefined;
  const campaign = slug ? findProductLoopCampaign(slug) : defaultProductLoopCampaign();
  if (!campaign?.proofBacked) notFound();

  return (
    <MerchantTerminalFlow
      campaign={campaign}
      initialPassCode={query?.pass ? decodeURIComponent(query.pass) : undefined}
      initialPassMac={query?.mac ? decodeURIComponent(query.mac) : undefined}
      initialPassId={query?.passId ? decodeURIComponent(query.passId) : undefined}
      initialNonce={query?.nonce ? decodeURIComponent(query.nonce) : undefined}
      terminalDevicePda={query?.terminal ? decodeURIComponent(query.terminal) : campaign.terminalDevicePda}
      merchantAlias={query?.merchant ? decodeURIComponent(query.merchant) : campaign.merchantAlias}
      token={query?.token ? decodeURIComponent(query.token) : campaign.slug}
    />
  );
}
