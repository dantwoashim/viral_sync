import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type Passport = { merchantAlias?: string; passportHash?: string; proofStatus?: string; commerceSignals?: Record<string, unknown> };
type Orderbook = { orderbookHash?: string; campaigns?: Array<{ slug?: string; proofBacked?: boolean; merchantAlias?: string; title?: string }> };
const DEFAULT_PASSPORT = path.join('app', 'public', 'proofs', 'merchant-passport.json');
const DEFAULT_ORDERBOOK = path.join('app', 'public', 'proofs', 'conversion-orderbook.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'merchant-validation-kit.json');
function argValue(args: string[], flag: string) { const i=args.indexOf(flag); return i>=0?args[i+1]:undefined; }
function readJson<T>(filePath: string, fallback: T): T { const p=path.resolve(filePath); return existsSync(p)?JSON.parse(readFileSync(p,'utf8')) as T:fallback; }
function writeJson(filePath: string, value: unknown) { const p=path.resolve(filePath); mkdirSync(path.dirname(p),{recursive:true}); writeFileSync(p,`${JSON.stringify(value,null,2)}\n`); return p; }
function stableJson(value: unknown): string { if(value===null||typeof value!=='object') return JSON.stringify(value); if(Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; const entries=Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)); return `{${entries.map(([k,v])=>`${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; }
function sha256(value: unknown) { return createHash('sha256').update(stableJson(value)).digest('hex'); }
function main() {
  const args=process.argv.slice(2);
  const passportPath=argValue(args,'--passport')??DEFAULT_PASSPORT;
  const orderbookPath=argValue(args,'--orderbook')??DEFAULT_ORDERBOOK;
  const outputPath=argValue(args,'--output')??DEFAULT_OUTPUT;
  const passport=readJson<Passport>(passportPath,{});
  const orderbook=readJson<Orderbook>(orderbookPath,{});
  const proofBackedCampaign=orderbook.campaigns?.find((campaign)=>campaign.proofBacked===true);
  const kitCore={
    type:'viral-sync-merchant-validation-kit',
    version:'1.0.0',
    generatedAt:new Date().toISOString(),
    validationStatus:'not_claimed_until_real_merchant_evidence_is_added',
    merchantAlias:passport.merchantAlias??proofBackedCampaign?.merchantAlias??'Thamel Brew House',
    sourcePassport:passportPath.replace(/\\/g,'/'),
    sourceOrderbook:orderbookPath.replace(/\\/g,'/'),
    passportHash:passport.passportHash,
    orderbookHash:orderbook.orderbookHash,
    rules:[
      'Do not claim live merchant traction unless evidenceSlots are filled with real permissioned evidence.',
      'Screenshots, quotes, and videos must be from a real merchant or must be labeled demo-only.',
      'The technical proof can be submitted without live merchant traction, but the pitch must not imply traction that does not exist.',
    ],
    interviewScript:[
      'What do you currently use to know whether a referral actually showed up?',
      'Would you rather pay for clicks, coupons, or counter-confirmed visits?',
      'Would a receipt-backed proof packet help you trust a campaign payout?',
      'What would stop you from using this at your counter?',
    ],
    evidenceSlots:[
      { id:'merchant-quote-1', status:'empty', requiredForClaimingTraction:true, prompt:'One-sentence quote from a real merchant after trying the demo.' },
      { id:'counter-demo-video-1', status:'empty', requiredForClaimingTraction:true, prompt:'Short video showing claim pass → terminal confirmation → proof page.' },
      { id:'merchant-photo-permissioned-1', status:'empty', requiredForClaimingTraction:false, prompt:'Optional photo of merchant/counter with permission.' },
      { id:'merchant-objection-log', status:'empty', requiredForClaimingTraction:false, prompt:'What the merchant disliked or would require before real use.' },
    ],
    safeSubmissionWording:'The Frontier submission includes a complete devnet proof and verifier. Real-world merchant validation is not claimed unless this kit is filled with permissioned evidence.',
  };
  const kit={...kitCore, validationKitHash:sha256(kitCore)};
  const written=writeJson(outputPath,kit);
  console.log(JSON.stringify({ok:true,outputPath:written,validationStatus:kit.validationStatus,validationKitHash:kit.validationKitHash},null,2));
}
main();
