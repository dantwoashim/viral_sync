import { NextResponse } from 'next/server';
import { appBaseUrl, withCorsHeaders } from '@/lib/http/cors';
import { createVisitPassPacket, findProductLoopCampaign } from '@/lib/product-loop/productLoop';
import { loadProofSidecar } from '@/lib/proof/loadArtifacts';

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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS_CORS = {
  methods: 'GET,POST,OPTIONS',
  headers: 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  extraHeaders: {
  'X-Action-Version': '2.4',
  },
};

function actionHeaders(response: NextResponse, request: Request, options: { publicRead?: boolean } = {}) {
  return withCorsHeaders(response, request, { ...ACTIONS_CORS, publicRead: options.publicRead });
}

function loadOrderbook(): Orderbook {
  return loadProofSidecar<Orderbook>('conversion-orderbook.json', { campaigns: [] });
}

function findCampaign(slug: string) {
  return loadOrderbook().campaigns?.find((campaign) => campaign.slug === slug);
}

export async function OPTIONS(request: Request) {
  return actionHeaders(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = findCampaign(slug);
  if (!campaign) return actionHeaders(NextResponse.json({ error: 'campaign_not_found' }, { status: 404 }), request, { publicRead: true });
  const baseUrl = appBaseUrl(request);
  const campaignPath = campaign.publicPath ?? `/campaign/${slug}`;
  return actionHeaders(NextResponse.json({
    icon: `${baseUrl}/icon.png`,
    title: campaign.title ?? 'Claim visit pass: Thamel Brew House',
    description: 'POC-1 proof-of-outcome campaign. Settlement requires terminal + visitor counter-attestation.',
    links: {
      actions: [
        { label: 'Claim visit pass', href: `${baseUrl}/claim/${encodeURIComponent(slug)}` },
        { label: 'Create proof-backed pass packet', href: `${baseUrl}/api/actions/campaign/${encodeURIComponent(slug)}`, type: 'post' },
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
      productLoop: findProductLoopCampaign(slug),
    },
  }), request, { publicRead: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null) as { token?: string } | null;
  let pass = null;
  try {
    pass = createVisitPassPacket(slug, body?.token?.trim() || slug);
  } catch {
    return actionHeaders(NextResponse.json({ ok: false, error: 'pass_issuance_not_available' }, { status: 503 }), request);
  }
  if (!pass) {
    return actionHeaders(NextResponse.json({ ok: false, error: 'proof_backed_campaign_not_found' }, { status: 404 }), request);
  }
  const baseUrl = appBaseUrl(request);
  const terminalUrl = `${baseUrl}/merchant/scan?slug=${encodeURIComponent(slug)}&pass=${encodeURIComponent(pass.passCode)}&mac=${encodeURIComponent(pass.passMac)}&token=${encodeURIComponent(pass.token)}&passId=${encodeURIComponent(pass.passId)}&nonce=${encodeURIComponent(pass.nonce)}&terminal=${encodeURIComponent(pass.campaign.terminalDevicePda)}&merchant=${encodeURIComponent(pass.campaign.merchantAlias)}`;
  return actionHeaders(NextResponse.json({
    ...pass,
    links: {
      terminal: terminalUrl,
      terminalSigned: terminalUrl,
      receipt: `${baseUrl}${pass.campaign.receiptPath}`,
      proof: `${baseUrl}/proof`,
    },
  }), request);
}
