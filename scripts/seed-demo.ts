import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const now = new Date().toISOString();
const merchant = {
  id: 'merchant-thamel-brew-house',
  name: 'Thamel Brew House',
  district: 'Thamel',
  city: 'Kathmandu',
  locationLabel: 'Thamel Coffee Lane',
};
const offer = {
  id: 'offer-thamel-brew-pass',
  merchantId: merchant.id,
  slug: 'thamel-brew-pass',
  title: 'Bring 3 friends. All 4 unlock Rs. 150 coffee credit.',
  description: 'Merchant-funded group reward for a dense district pilot. Confirmation happens at the counter.',
  reward: 'Rs. 150 coffee credit for each guest',
  referralGoal: 3,
  redemptionWindowHours: 72,
  active: true,
  createdAt: now,
};

const ledger = {
  merchants: [merchant],
  offers: [offer],
  referralLinks: [],
  claims: [],
  redeemCodes: [],
  visitChallenges: [],
  causalReceipts: [],
  merchantSessions: [],
  staffDevices: [{
    id: 'staff-device-front-counter',
    merchantId: merchant.id,
    locationLabel: merchant.locationLabel,
    label: 'Front counter terminal',
    publicKey: 'staff_seed_front_counter',
    enrolledAt: now,
  }],
  auditEvents: [],
  rewardLedgerEntries: [],
  idempotencyRecords: [],
  events: [{ id: 'evt-offer', type: 'offer_created', createdAt: now, merchantId: merchant.id, offerId: offer.id }],
};

const outDir = join(process.cwd(), 'app', '.local');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'launch-ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`);
