/**
 * bKash Theme and Styling Constants
 * Provides consistent bKash-style colors, spacing, and design tokens
 */

export const bkashColors = {
  // Primary bKash colors
  primary: '#E2136E',
  primaryDark: '#C10E5F',
  primaryLight: '#E8397A',
  
  // Secondary colors
  secondary: '#FFFFFF',
  secondaryDark: '#F8F8F8',
  
  // Accent colors
  accent: '#F0F0F0',
  accentDark: '#E0E0E0',
  
  // Status colors
  success: '#28A745',
  successLight: '#D4EDDA',
  successDark: '#1E7E34',
  
  error: '#DC3545',
  errorLight: '#F8D7DA',
  errorDark: '#C82333',
  
  warning: '#FFC107',
  warningLight: '#FFF3CD',
  warningDark: '#E0A800',
  
  info: '#17A2B8',
  infoLight: '#D1ECF1',
  infoDark: '#138496',
  
  // Neutral colors
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  
  // Text colors
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    light: '#9CA3AF',
    white: '#FFFFFF'
  },
  
  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    accent: '#F3F4F6',
    dark: '#1F2937'
  }
} as const;

export const bkashSpacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
} as const;

export const bkashBorderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
} as const;

export const bkashShadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
} as const;

export const bkashFontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem'  // 36px
} as const;

export const bkashFontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
} as const;

/**
 * Get bKash button styles based on variant
 */
export const getBkashButtonStyles = (variant: 'primary' | 'secondary' | 'success' | 'error' | 'outline' = 'primary') => {
  const baseStyles = {
    padding: `${bkashSpacing.md} ${bkashSpacing.xl}`,
    borderRadius: bkashBorderRadius.lg,
    fontSize: bkashFontSizes.base,
    fontWeight: bkashFontWeights.semibold,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: bkashSpacing.sm
  };

  const variants = {
    primary: {
      backgroundColor: bkashColors.primary,
      color: bkashColors.secondary,
      boxShadow: bkashShadows.md,
      '&:hover': {
        backgroundColor: bkashColors.primaryDark,
        boxShadow: bkashShadows.lg
      },
      '&:active': {
        backgroundColor: bkashColors.primaryDark,
        transform: 'translateY(1px)'
      }
    },
    secondary: {
      backgroundColor: bkashColors.secondary,
      color: bkashColors.primary,
      border: `2px solid ${bkashColors.primary}`,
      '&:hover': {
        backgroundColor: bkashColors.secondaryDark,
        borderColor: bkashColors.primaryDark
      }
    },
    success: {
      backgroundColor: bkashColors.success,
      color: bkashColors.secondary,
      '&:hover': {
        backgroundColor: bkashColors.successDark
      }
    },
    error: {
      backgroundColor: bkashColors.error,
      color: bkashColors.secondary,
      '&:hover': {
        backgroundColor: bkashColors.errorDark
      }
    },
    outline: {
      backgroundColor: 'transparent',
      color: bkashColors.primary,
      border: `2px solid ${bkashColors.primary}`,
      '&:hover': {
        backgroundColor: bkashColors.primary,
        color: bkashColors.secondary
      }
    }
  };

  return { ...baseStyles, ...variants[variant] };
};

/**
 * Get bKash input field styles
 */
export const getBkashInputStyles = (state: 'default' | 'focus' | 'error' | 'success' = 'default') => {
  const baseStyles = {
    padding: `${bkashSpacing.md} ${bkashSpacing.lg}`,
    borderRadius: bkashBorderRadius.lg,
    fontSize: bkashFontSizes.base,
    border: `2px solid ${bkashColors.gray[300]}`,
    backgroundColor: bkashColors.background.primary,
    color: bkashColors.text.primary,
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    width: '100%'
  };

  const states = {
    default: {},
    focus: {
      borderColor: bkashColors.primary,
      boxShadow: `0 0 0 3px ${bkashColors.primary}20`
    },
    error: {
      borderColor: bkashColors.error,
      boxShadow: `0 0 0 3px ${bkashColors.error}20`
    },
    success: {
      borderColor: bkashColors.success,
      boxShadow: `0 0 0 3px ${bkashColors.success}20`
    }
  };

  return { ...baseStyles, ...states[state] };
};

/**
 * Get bKash card styles
 */
export const getBkashCardStyles = (elevated: boolean = false) => {
  return {
    backgroundColor: bkashColors.background.primary,
    borderRadius: bkashBorderRadius.xl,
    padding: bkashSpacing['2xl'],
    border: `1px solid ${bkashColors.gray[200]}`,
    boxShadow: elevated ? bkashShadows.lg : bkashShadows.sm,
    transition: 'all 0.2s ease-in-out'
  };
};

/**
 * Get bKash alert styles based on type
 */
export const getBkashAlertStyles = (type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  const baseStyles = {
    padding: bkashSpacing.lg,
    borderRadius: bkashBorderRadius.lg,
    fontSize: bkashFontSizes.sm,
    fontWeight: bkashFontWeights.medium,
    display: 'flex',
    alignItems: 'center',
    gap: bkashSpacing.sm
  };

  const types = {
    success: {
      backgroundColor: bkashColors.successLight,
      color: bkashColors.successDark,
      border: `1px solid ${bkashColors.success}`
    },
    error: {
      backgroundColor: bkashColors.errorLight,
      color: bkashColors.errorDark,
      border: `1px solid ${bkashColors.error}`
    },
    warning: {
      backgroundColor: bkashColors.warningLight,
      color: bkashColors.warningDark,
      border: `1px solid ${bkashColors.warning}`
    },
    info: {
      backgroundColor: bkashColors.infoLight,
      color: bkashColors.infoDark,
      border: `1px solid ${bkashColors.info}`
    }
  };

  return { ...baseStyles, ...types[type] };
};

/**
 * bKash loading spinner styles
 */
export const bkashSpinnerStyles = {
  width: '20px',
  height: '20px',
  border: `2px solid ${bkashColors.gray[300]}`,
  borderTop: `2px solid ${bkashColors.primary}`,
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

/**
 * bKash CSS animations
 */
export const bkashAnimations = {
  spin: `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `,
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideUp: `
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `
};

/**
 * Utility function to generate CSS custom properties for bKash theme
 */
export const generateBkashCSSVariables = () => {
  return `
    :root {
      --bkash-primary: ${bkashColors.primary};
      --bkash-primary-dark: ${bkashColors.primaryDark};
      --bkash-primary-light: ${bkashColors.primaryLight};
      --bkash-secondary: ${bkashColors.secondary};
      --bkash-success: ${bkashColors.success};
      --bkash-error: ${bkashColors.error};
      --bkash-warning: ${bkashColors.warning};
      --bkash-info: ${bkashColors.info};
      --bkash-spacing-sm: ${bkashSpacing.sm};
      --bkash-spacing-md: ${bkashSpacing.md};
      --bkash-spacing-lg: ${bkashSpacing.lg};
      --bkash-spacing-xl: ${bkashSpacing.xl};
      --bkash-border-radius: ${bkashBorderRadius.lg};
      --bkash-shadow: ${bkashShadows.md};
    }
  `;
};