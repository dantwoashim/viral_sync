import { NextResponse } from 'next/server';

type Campaign = {
  slug?: string;
  title?: string;
  proofBacked?: boolean;
  status?: string;
  publicPath?: string;
  proofLevel?: string;
  attestationModel?: string;
  verification?: Record<string, boolean>;
};
type Orderbook = { campaigns?: Campaign[] };

const ACTIONS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'X-Action-Version': '2.4',
};

function actionHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(ACTIONS_HEADERS)) response.headers.set(key, value);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

async function loadOrderbook(request: Request): Promise<Orderbook> {
  try {
    const res = await fetch(new URL('/proofs/conversion-orderbook.json', request.url), {
      cache: 'no-store',
    });
    if (!res.ok) return { campaigns: [] };
    return (await res.json()) as Orderbook;
  } catch {
    return { campaigns: [] };
  }
}

async function findCampaign(request: Request, slug: string) {
  return (await loadOrderbook(request)).campaigns?.find((campaign) => campaign.slug === slug);
}

function appBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(request.url).origin || 'http://localhost:3000';
}

export async function OPTIONS() {
  return actionHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await findCampaign(request, slug);
  if (!campaign) return actionHeaders(NextResponse.json({ error: 'campaign_not_found' }, { status: 404 }));
  const baseUrl = appBaseUrl(request);
  const campaignPath = campaign.publicPath ?? `/campaign/${slug}`;
  return actionHeaders(NextResponse.json({
    icon: `${baseUrl}/icon.png`,
    title: campaign.title ?? 'Claim visit pass: Thamel Brew House',
    description: 'POC-1 proof-of-outcome campaign. Settlement requires terminal + visitor counter-attestation.',
    links: {
      actions: [
        { label: 'Claim visit pass', href: `${baseUrl}/claim/${encodeURIComponent(slug)}` },
        { label: 'View proof', href: `${baseUrl}${campaignPath}` },
      ],
    },
    viralSync: {
      type: 'blink_campaign_metadata',
      proofBacked: campaign.proofBacked === true,
      proofLevel: campaign.proofLevel,
      attestationModel: campaign.attestationModel,
      verification: campaign.verification,
      status: campaign.status,
    },
  }));
}
