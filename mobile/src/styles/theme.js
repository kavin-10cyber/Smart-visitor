// Unified Design System Theme based on Campus-Go Brand Visual Identity
export const theme = {
  colors: {
    // Primary Navy Brand System
    primary: '#0B2A5B',
    primaryDark: '#071D40',
    primarySecondary: '#123B73',
    blueSurface: '#163F75',
    primaryLight: '#35D49A',
    primaryGradient: ['#35D49A', '#28C7A0'],
    primarySoft: '#F1F5FA',
    primaryBorder: '#DCE5F0',

    // Green / Teal Accents
    accentGreen: '#35D49A',
    accentTeal: '#28C7A0',
    accentGreenDark: '#20A879',
    accentLight: '#DDF8EE',

    // White / Light Surfaces
    background: '#F7F9FC',
    cardBackground: '#FFFFFF',
    cardBorder: '#DCE5F0',
    lightBlueSurface: '#F1F5FA',

    // Text & Typographic Hierarchy
    textPrimary: '#10233F',
    textSecondary: '#52657D',
    textMuted: '#7B8CA3',
    textLight: '#CBD5E1',

    // Dark Button Accents
    darkButton: '#071D40',
    darkButtonHover: '#0B2A5B',

    // Category & Tag Colors
    pastels: {
      pink: { bg: '#FFE4E8', text: '#E11D48', border: '#FECDD3' },
      peach: { bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
      purple: { bg: '#F1F5FA', text: '#123B73', border: '#DCE5F0' },
      cyan: { bg: '#DDF8EE', text: '#20A879', border: '#35D49A' },
      green: { bg: '#DDF8EE', text: '#20A879', border: '#35D49A' },
    },

    // Status Colors
    status: {
      active: { bg: '#DDF8EE', text: '#20A879', dot: '#35D49A' },
      scheduled: { bg: '#F1F5FA', text: '#123B73', dot: '#28C7A0' },
      completed: { bg: '#F1F5FA', text: '#52657D', dot: '#7B8CA3' },
      cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
      inUse: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
      available: { bg: '#DDF8EE', text: '#20A879', dot: '#35D49A' },
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
      shadowColor: '#071D40',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    heroCard: {
      shadowColor: '#071D40',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 6,
    },
    fab: {
      shadowColor: '#0B2A5B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    },
    navBar: {
      shadowColor: '#071D40',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
