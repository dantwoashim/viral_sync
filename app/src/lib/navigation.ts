import {
  BookOpen,
  ChartBar,
  Compass,
  House,
  Megaphone,
  QrCode,
  Receipt,
  ShareNetwork,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';

export const consumerTabs = [
  { href: '/', label: 'Home', icon: House },
  { href: '/passbook', label: 'Passbook', icon: BookOpen },
  { href: '/routes', label: 'Routes', icon: Compass },
  { href: '/invite', label: 'Invite', icon: ShareNetwork },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export const merchantTabs = [
  { href: '/merchant/today', label: 'Today', icon: ChartBar },
  { href: '/merchant/scan', label: 'Scan', icon: QrCode },
  { href: '/merchant/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/merchant/customers', label: 'Customers', icon: UsersThree },
  { href: '/merchant/ledger', label: 'Ledger', icon: Receipt },
];
