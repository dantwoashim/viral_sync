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

function appBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(request.url).origin || 'http://localhost:3000';
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = findCampaign(slug);
  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });
  const baseUrl = appBaseUrl(request);
  const campaignPath = campaign.publicPath ?? `/campaign/${slug}`;
  return NextResponse.json({
    icon: `${baseUrl}/icon.png`,
    title: campaign.title ?? 'Claim visit pass: Thamel Brew House',
    description: 'POC-1 proof-of-outcome campaign. Settlement requires terminal + visitor counter-attestation.',
    links: { actions: [{ label: 'View proof', href: `${baseUrl}${campaignPath}` }] },
    viralSync: {
      type: 'get_only_blink_campaign_metadata',
      proofBacked: campaign.proofBacked === true,
      proofLevel: campaign.proofLevel,
      attestationModel: campaign.attestationModel,
      verification: campaign.verification,
      status: campaign.status,
      limitation: 'GET-only metadata. Transactional claim-pass creation stays out of this route until the devnet terminal flow is stable.',
    },
  });
}
