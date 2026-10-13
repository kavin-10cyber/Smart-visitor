// Unified Design System Theme based on Modern Violet & Pastel Reference UI
export const theme = {
  colors: {
    // Primary Vibrant Violet / Purple Accent
    primary: '#6C5CE7',
    primaryLight: '#8B78FF',
    primaryDark: '#5642DE',
    primaryGradient: ['#6C5CE7', '#8B78FF'],
    primarySoft: '#F4F0FF',
    primaryBorder: '#E5DDFF',

    // Canvas & Neutral Backgrounds
    background: '#F7F8FC',
    cardBackground: '#FFFFFF',
    cardBorder: '#EEF0F6',

    // Text & Typographic Hierarchy
    textPrimary: '#14172C',
    textSecondary: '#667085',
    textMuted: '#94A3B8',
    textLight: '#CBD5E1',

    // Dark Button Accents (Obsidian / Carbon pills from reference)
    darkButton: '#141624',
    darkButtonHover: '#23263B',

    // Pastel Category & Tag Colors (from Reference Image)
    pastels: {
      pink: { bg: '#FFE4E8', text: '#E11D48', border: '#FECDD3' },
      peach: { bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
      purple: { bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
      cyan: { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' },
      green: { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
    },

    // Status Colors
    status: {
      active: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
      scheduled: { bg: '#E0F2FE', text: '#075985', dot: '#0284C7' },
      completed: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
      cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
      inUse: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
      available: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
    },
  },

  borderRadius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },

  shadows: {
    card: {
      shadowColor: '#6C5CE7',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    heroCard: {
      shadowColor: '#6C5CE7',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 6,
    },
    fab: {
      shadowColor: '#6C5CE7',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    },
    navBar: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
