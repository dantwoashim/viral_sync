export const consumerLaunch = {
  district: 'Thamel Pilot',
  headline: 'Bring 3 friends. All 4 unlock a warm momo set.',
  subheadline:
    'The first launch loop is built for after-class hangs, office tea breaks, and group stopovers in Kathmandu.',
  merchant: 'Nyano Chiya Ghar',
  expiresAt: 'Today, 8:30 PM',
  routeName: 'Night Chowk Route',
  nextAction: 'One more friend joins and the whole table gets the copper ticket.',
  progressCurrent: 2,
  progressTotal: 3,
};

export const consumerStamps = [
  'Sajina opened your pass',
  'Ritesh claimed the offer',
  'One more friend unlocks the reward',
];

export const consumerPassbook = [
  {
    title: 'Copper Ticket is in progress',
    subtitle: '2 of 3 friends have claimed the Nyano Chiya Ghar group reward.',
    meta: 'Today · Thamel',
    value: '1 friend left',
  },
  {
    title: 'Bhotebahal lunch stamp redeemed',
    subtitle: 'Free masala tea was unlocked after a repeat visit.',
    meta: 'Yesterday · Bhotebahal',
    value: 'Redeemed',
  },
  {
    title: 'Jhamsikhel route opened',
    subtitle: 'The next route gives a district badge after three merchant stops.',
    meta: 'Thu · Jhamsikhel',
    value: 'Route active',
  },
];

export const consumerRoutes = [
  {
    title: 'Night Chowk Route',
    subtitle: 'Tea, momo, and one live-music stop packed into an evening loop.',
    meta: '3 stops · Thamel',
    complete: true,
  },
  {
    title: 'Courtyard Pause',
    subtitle: 'Quiet afternoon route built around Patan courtyards and cafe stamps.',
    meta: '4 stops · Patan',
    complete: false,
  },
  {
    title: 'Lakeside Detour',
    subtitle: 'Weekend route designed for Pokhara visitors and local crews.',
    meta: '5 stops · Pokhara',
    complete: false,
  },
];

export const merchantToday = {
  name: 'Nyano Chiya Ghar',
  district: 'Thamel',
  status: 'Staff mode is live. Manual confirmation is on.',
  metrics: [
    { label: 'Attributed visits', note: 'Today', value: '12', tone: 'tone-blue' },
    { label: 'Redemptions', note: 'Today', value: '7', tone: 'tone-vermilion' },
    { label: 'Repeat guests', note: '7-day view', value: '4', tone: 'tone-copper' },
    { label: 'Likely organic', note: 'Held out', value: '3', tone: 'tone-moss' },
  ],
  queue: [
    {
      title: 'Copper Ticket waiting at table 4',
      subtitle: 'Group of four arrived from Sajina’s invite chain.',
      meta: '2 min ago',
      value: 'Ready',
    },
    {
      title: 'First-time reward claimed',
      subtitle: 'One guest entered through a paper QR at the front counter.',
      meta: '8 min ago',
      value: 'Claimed',
    },
    {
      title: 'Repeat customer spotted',
      subtitle: 'A prior redeemer is back inside the 10-day campaign window.',
      meta: '14 min ago',
      value: 'Repeat',
    },
  ],
  alerts: [
    'One self-referral attempt was blocked from the same device cluster.',
    'The table tent QR near the window is outperforming the cashier QR.',
  ],
};

export const merchantCampaignDefaults = {
  title: 'Four friends unlock tea + momo',
  reward: '1 plate buff momo + 4 masala teas',
  threshold: '3 successful invited claims',
  window: 'Redeem within 72 hours',
  budgetHint: 'Merchant-funded reward cost stays under NPR 780 for each completed group.',
};

export const merchantCustomers = [
  {
    title: 'Sajina Adhikari',
    subtitle: 'Top active referrer this week with 4 successful claim chains.',
    meta: 'Trust tier A',
    value: '4 chains',
  },
  {
    title: 'Prabin Shrestha',
    subtitle: 'Repeat customer returning for the third time in 12 days.',
    meta: 'Repeat',
    value: '3 visits',
  },
  {
    title: 'Ansu Maharjan',
    subtitle: 'High-intent visitor with one route almost complete.',
    meta: 'Route ready',
    value: '2 stops left',
  },
];

export const merchantLedgerRows = [
  {
    title: 'Attributed redemptions',
    subtitle: 'Completed rewards confirmed by staff this billing cycle.',
    meta: 'March 2026',
    value: '34',
  },
  {
    title: 'Estimated reward cost',
    subtitle: 'Merchant-side cost of fulfilled offers based on current templates.',
    meta: 'March 2026',
    value: 'NPR 6,420',
  },
  {
    title: 'Pilot fee',
    subtitle: 'Deferred until the pilot produces verified redemptions.',
    meta: 'Revenue-share mode',
    value: 'Pending',
  },
];
