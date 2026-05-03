import { NextResponse } from 'next/server';
import orderbookArtifact from '../../../../../../public/proofs/conversion-orderbook.json';

type Campaign = {
  slug?: string;
  title?: string;
  merchantAlias?: string;
  proofBacked?: boolean;
  status?: string;
  publicPath?: string;
  proofLevel?: string;
  attestationModel?: string;
  bounty?: Record<string, unknown>;
  verification?: Record<string, boolean>;
};
type Orderbook = { campaigns?: Campaign[] };

function findCampaign(slug: string) {
  const orderbook = orderbookArtifact as Orderbook;
  return orderbook.campaigns?.find((campaign) => campaign.slug === slug);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = findCampaign(slug);
  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });
  return NextResponse.json({
    title: campaign.title,
    icon: 'https://dummyimage.com/96x96/0b2a22/ffffff.png&text=VS',
    description: `${campaign.merchantAlias ?? 'Merchant'} - ${campaign.proofBacked ? 'proof-backed demo campaign' : 'vision-only preview'} - reward ${String(campaign.bounty?.rewardUnits ?? 'future')} units after POC-1 conversion.`,
    label: campaign.proofBacked ? 'Claim pass preview' : 'Preview campaign',
    links: { actions: [{ label: 'Open campaign', href: campaign.publicPath ?? `/campaign/${slug}` }] },
    viralSync: {
      type: 'blink_style_preview_only',
      proofBacked: campaign.proofBacked === true,
      proofLevel: campaign.proofLevel,
      attestationModel: campaign.attestationModel,
      verification: campaign.verification,
      status: campaign.status,
      limitation: 'This endpoint returns metadata for a campaign link. It does not build or submit a production Solana transaction.',
    },
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = findCampaign(slug);
  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });
  return NextResponse.json({
    type: 'external_link',
    label: campaign.proofBacked ? 'Open proof-backed claim pass preview' : 'Open vision-only campaign preview',
    href: campaign.publicPath ?? `/campaign/${slug}`,
    message: 'Viral Sync uses this as a safe Blink-style preview. Live transaction construction remains inside the verified proof script and terminal flow.',
  });
}
