import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type Orderbook = { proofStatus?: string; orderbookHash?: string; campaigns?: Array<Record<string, unknown> & { slug?: string; title?: string; publicPath?: string; merchantAlias?: string; proofBacked?: boolean; status?: string; proofLevel?: string; attestationModel?: string; verification?: Record<string, boolean>; links?: Record<string, string | undefined> }> };
const DEFAULT_ORDERBOOK = path.join('app', 'public', 'proofs', 'conversion-orderbook.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'campaign-links.json');
function argValue(args: string[], flag: string) { const i=args.indexOf(flag); return i>=0?args[i+1]:undefined; }
function readJson<T>(filePath: string, fallback: T): T { const p=path.resolve(filePath); return existsSync(p)?JSON.parse(readFileSync(p,'utf8')) as T:fallback; }
function writeJson(filePath: string, value: unknown) { const p=path.resolve(filePath); mkdirSync(path.dirname(p),{recursive:true}); writeFileSync(p,`${JSON.stringify(value,null,2)}\n`); return p; }
function stableJson(value: unknown): string { if(value===null||typeof value!=='object') return JSON.stringify(value); if(Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; const entries=Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)); return `{${entries.map(([k,v])=>`${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; }
function sha256(value: unknown) { return createHash('sha256').update(stableJson(value)).digest('hex'); }

function main() {
  const args=process.argv.slice(2);
  const orderbookPath=argValue(args,'--orderbook')??DEFAULT_ORDERBOOK;
  const outputPath=argValue(args,'--output')??DEFAULT_OUTPUT;
  const orderbook=readJson<Orderbook>(orderbookPath,{});
  const campaigns=orderbook.campaigns??[];
  const links=campaigns.map((campaign)=>{
    const slug=campaign.slug??'unknown';
    const pathValue=campaign.publicPath??`/campaign/${slug}`;
    return {
      slug,
      title: campaign.title,
      merchantAlias: campaign.merchantAlias,
      proofBacked: campaign.proofBacked===true,
      campaignUrl: pathValue,
      actionApi: `/api/actions/campaign/${slug}`,
      receiptUrl: '/receipt/latest',
      proofUrl: campaign.links?.proof ?? '/proof',
      gauntletUrl: campaign.links?.gauntlet ?? '/proof',
      passportUrl: campaign.links?.passport ?? '/merchant-passport',
      proofLevel: campaign.proofLevel,
      campaignProofLevel: campaign.proofLevel,
      attestationModel: campaign.attestationModel,
      terminalVerified: campaign.verification?.terminalVerified === true,
      visitorVerified: campaign.verification?.visitorVerified === true,
      lineageVerified: campaign.verification?.lineageVerified === true,
      settlementVerified: campaign.verification?.settlementVerified === true,
      status: campaign.proofBacked === true && campaign.verification?.terminalVerified === true && campaign.verification?.visitorVerified === true && campaign.verification?.lineageVerified === true && campaign.verification?.settlementVerified === true ? 'verified' : campaign.status,
      shareCopy: campaign.proofBacked
        ? `Claim a counter-attested conversion pass for ${campaign.merchantAlias ?? 'this merchant'}: ${pathValue}`
        : `Preview a future Viral Sync proof-of-conversion campaign: ${pathValue}`,
      qrPayload: pathValue,
    };
  });
  const core={
    type:'viral-sync-campaign-links',
    version:'1.0.0',
    generatedAt:new Date().toISOString(),
    sourceOrderbook:orderbookPath.replace(/\\/g,'/'),
    orderbookHash:orderbook.orderbookHash,
    proofStatus:orderbook.proofStatus??'unknown',
    links,
    limitations:[
      'The API route returns a Blink-style preview object; it does not submit a production payment transaction.',
      'Only proofBacked=true campaigns are backed by the current devnet proof artifact.',
    ],
  };
  const out={...core, campaignLinksHash:sha256(core)};
  const written=writeJson(outputPath,out);
  const failures:string[]=[];
  if(links.length===0) failures.push('No campaigns found in conversion orderbook.');
  const proofBacked = links.find((link)=>link.proofBacked);
  if(!proofBacked) failures.push('No proof-backed campaign link exists.');
  if(proofBacked){
    for(const key of ['terminalVerified','visitorVerified','lineageVerified','settlementVerified'] as const){
      if(proofBacked[key] !== true) failures.push(`Proof-backed campaign link ${key} is not true.`);
    }
    if(proofBacked.status !== 'verified') failures.push('Proof-backed campaign link status is not verified.');
    if(proofBacked.proofLevel !== 'counter_attested' && proofBacked.campaignProofLevel !== 'counter_attested') failures.push('Proof-backed campaign link proof level is not counter_attested.');
  }
  console.log(JSON.stringify({ok:failures.length===0,outputPath:written,campaignLinksHash:out.campaignLinksHash,links:links.length,failures},null,2));
  if(failures.length>0) process.exitCode=1;
}
main();
