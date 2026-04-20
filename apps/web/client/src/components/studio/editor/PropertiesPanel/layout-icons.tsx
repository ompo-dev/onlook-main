import React from 'react';

const S = 2;
const P = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: S,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const AlignLeftIcon = () => <svg {...P}><path d="M21 5H3" /><path d="M15 12H3" /><path d="M17 19H3" /></svg>;
export const AlignCenterIcon = () => <svg {...P}><path d="M21 5H3" /><path d="M17 12H7" /><path d="M19 19H5" /></svg>;
export const AlignRightIcon = () => <svg {...P}><path d="M21 5H3" /><path d="M21 12H9" /><path d="M21 19H7" /></svg>;
export const AlignJustifyIcon = () => <svg {...P}><path d="M3 5h18" /><path d="M3 12h18" /><path d="M3 19h18" /></svg>;

export const ArrowRightIcon = () => <svg {...P}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
export const ArrowLeftIcon = () => <svg {...P}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
export const ArrowDownIcon = () => <svg {...P}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>;
export const ArrowUpIcon = () => <svg {...P}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>;

export const AlignStretchHIcon = () => <svg {...P}><rect width="20" height="6" x="2" y="4" rx="2" /><rect width="20" height="6" x="2" y="14" rx="2" /></svg>;
export const AlignStartHIcon = () => <svg {...P}><rect width="6" height="16" x="4" y="6" rx="2" /><rect width="6" height="9" x="14" y="6" rx="2" /><path d="M22 2H2" /></svg>;
export const AlignCenterHIcon = () => <svg {...P}><path d="M2 12h20" /><path d="M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" /><path d="M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" /><path d="M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1" /><path d="M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1" /></svg>;
export const AlignEndHIcon = () => <svg {...P}><rect width="6" height="16" x="4" y="2" rx="2" /><rect width="6" height="9" x="14" y="9" rx="2" /><path d="M22 22H2" /></svg>;

export const AlignStretchVIcon = () => <svg {...P}><rect width="6" height="20" x="4" y="2" rx="2" /><rect width="6" height="20" x="14" y="2" rx="2" /></svg>;
export const AlignStartVIcon = () => <svg {...P}><rect width="16" height="6" x="6" y="4" rx="2" /><rect width="9" height="6" x="6" y="14" rx="2" /><path d="M2 22V2" /></svg>;
export const AlignCenterVIcon = () => <svg {...P}><path d="M12 2v20" /><path d="M8 10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" /><path d="M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" /><path d="M8 20H7a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1" /><path d="M16 20h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1" /></svg>;
export const AlignEndVIcon = () => <svg {...P}><rect width="16" height="6" x="2" y="4" rx="2" /><rect width="9" height="6" x="9" y="14" rx="2" /><path d="M22 22V2" /></svg>;

export const GridStretchIcon = AlignStretchHIcon;
export const GridStartIcon = AlignStartHIcon;
export const GridCenterIcon = AlignCenterHIcon;
export const GridEndIcon = AlignEndHIcon;

export const NoWrapIcon = () => <svg {...P}><path d="M18 8L22 12L18 16" /><path d="M2 12H22" /></svg>;
export const WrapIcon = () => <svg {...P}><path d="m15 10 5 5-5 5" /><path d="M4 4v7a4 4 0 0 0 4 4h12" /></svg>;
export const WrapReverseIcon = () => <svg {...P}><path d="M20 4v7a4 4 0 0 1-4 4H4" /><path d="m9 10-5 5 5 5" /></svg>;

export const DecorationNoneIcon = () => <svg {...P}><text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor" stroke="none">T</text></svg>;
export const UnderlineIcon = () => <svg {...P}><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" x2="20" y1="20" y2="20" /></svg>;
export const OverlineIcon = () => <svg {...P}><line x1="4" x2="20" y1="4" y2="4" /><text x="12" y="19" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor" stroke="none">T</text></svg>;
export const StrikethroughIcon = () => <svg {...P}><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" x2="20" y1="12" y2="12" /></svg>;

const TP = { ...P, stroke: 'none', fill: 'currentColor' };

export const TransformNoneIcon = () => <svg {...TP}><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth={2} /></svg>;
export const UppercaseIcon = () => <svg {...TP}><text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="system-ui">AB</text></svg>;
export const LowercaseIcon = () => <svg {...TP}><text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="system-ui">ab</text></svg>;
export const CapitalizeIcon = () => <svg {...TP}><text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="system-ui">Ab</text></svg>;
