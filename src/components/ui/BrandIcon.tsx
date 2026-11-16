import React from 'react';
import {
  Tv, Music, Play, Film, Smartphone, Wifi, Zap, Droplets,
  Shield, Gamepad2, CreditCard, Landmark, Wallet, Banknote, Sparkles
} from 'lucide-react';

export interface BrandDefinition {
  key: string;
  label: string;
  bg: string;
  fg: string;
  short: string;
}

export const BRAND_CATALOG: BrandDefinition[] = [
  { key: 'netflix', label: 'Netflix', bg: '#E50914', fg: '#FFFFFF', short: 'N' },
  { key: 'spotify', label: 'Spotify', bg: '#1DB954', fg: '#FFFFFF', short: 'S' },
  { key: 'youtube', label: 'YouTube', bg: '#FF0000', fg: '#FFFFFF', short: 'YT' },
  { key: 'disney', label: 'Disney+', bg: '#113CCF', fg: '#FFFFFF', short: 'D+' },
  { key: 'prime', label: 'Amazon Prime Video', bg: '#00A8E1', fg: '#FFFFFF', short: 'PV' },
  { key: 'apple', label: 'Apple Services', bg: '#1D1D1F', fg: '#FFFFFF', short: 'AP' },
  { key: 'psplus', label: 'PlayStation Plus', bg: '#00439C', fg: '#FFFFFF', short: 'PS' },
  { key: 'xbox', label: 'Xbox Game Pass', bg: '#107C10', fg: '#FFFFFF', short: 'XB' },
  { key: 'internet', label: 'Internet', bg: '#3559D8', fg: '#FFFFFF', short: 'NET' },
  { key: 'mobile', label: 'Telefonía Móvil', bg: '#0F766E', fg: '#FFFFFF', short: 'TEL' },
  { key: 'electricity', label: 'Electricidad', bg: '#D99A32', fg: '#FFFFFF', short: 'LUZ' },
  { key: 'water', label: 'Agua', bg: '#0284C7', fg: '#FFFFFF', short: 'H2O' },
  { key: 'insurance', label: 'Seguro', bg: '#4F46E5', fg: '#FFFFFF', short: 'SEG' },
  { key: 'custom', label: 'Servicio Personalizado', bg: '#64748B', fg: '#FFFFFF', short: 'SRV' },
];

export const BrandIcon: React.FC<{ brandKey: string; size?: 'sm' | 'md' }> = ({ brandKey, size = 'md' }) => {
  const found = BRAND_CATALOG.find((b) => b.key === brandKey) ?? BRAND_CATALOG[BRAND_CATALOG.length - 1]!;
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-bold tracking-tight shrink-0 select-none ${dim}`}
      style={{ backgroundColor: found.bg, color: found.fg }}
      title={found.label}
    >
      {found.short}
    </span>
  );
};

export const AccountTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'cash': return <Banknote className="w-4 h-4" />;
    case 'checking': return <Landmark className="w-4 h-4" />;
    case 'savings': return <Sparkles className="w-4 h-4" />;
    case 'credit_card': return <CreditCard className="w-4 h-4" />;
    case 'digital_wallet': return <Wallet className="w-4 h-4" />;
    default: return <Landmark className="w-4 h-4" />;
  }
};
