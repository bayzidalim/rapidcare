/**
 * Unit tests for bKash theme utilities
 */
import {
  bkashColors,
  bkashSpacing,
  bkashBorderRadius,
  bkashShadows,
  bkashFontSizes,
  bkashFontWeights,
  getBkashButtonStyles,
  getBkashInputStyles,
  getBkashCardStyles,
  getBkashAlertStyles,
  bkashSpinnerStyles,
  generateBkashCSSVariables
} from '../bkash-theme';

describe('bKash Theme Utilities', () => {
  describe('Color Constants', () => {
    it('should have correct primary colors', () => {
      expect(bkashColors.primary).toBe('#E2136E');
      expect(bkashColors.primaryDark).toBe('#C10E5F');
      expect(bkashColors.primaryLight).toBe('#E8397A');
    });

    it('should have correct secondary colors', () => {
      expect(bkashColors.secondary).toBe('#FFFFFF');
      expect(bkashColors.secondaryDark).toBe('#F8F8F8');
    });

    it('should have correct status colors', () => {
      expect(bkashColors.success).toBe('#28A745');
      expect(bkashColors.error).toBe('#DC3545');
      expect(bkashColors.warning).toBe('#FFC107');
      expect(bkashColors.info).toBe('#17A2B8');
    });

    it('should have gray scale colors', () => {
      expect(bkashColors.gray[50]).toBe('#F9FAFB');
      expect(bkashColors.gray[500]).toBe('#6B7280');
      expect(bkashColors.gray[900]).toBe('#111827');
    });
  });

  describe('Spacing Constants', () => {
    it('should have correct spacing values', () => {
      expect(bkashSpacing.xs).toBe('0.25rem');
      expect(bkashSpacing.sm).toBe('0.5rem');
      expect(bkashSpacing.md).toBe('0.75rem');
      expect(bkashSpacing.lg).toBe('1rem');
      expect(bkashSpacing.xl).toBe('1.5rem');
    });
  });

  describe('Border Radius Constants', () => {
    it('should have correct border radius values', () => {
      expect(bkashBorderRadius.none).toBe('0');
      expect(bkashBorderRadius.sm).toBe('0.125rem');
      expect(bkashBorderRadius.md).toBe('0.375rem');
      expect(bkashBorderRadius.lg).toBe('0.5rem');
      expect(bkashBorderRadius.full).toBe('9999px');
    });
  });

  describe('Shadow Constants', () => {
    it('should have shadow definitions', () => {
      expect(bkashShadows.sm).toContain('rgba(0, 0, 0, 0.05)');
      expect(bkashShadows.md).toContain('rgba(0, 0, 0, 0.1)');
      expect(bkashShadows.lg).toContain('rgba(0, 0, 0, 0.1)');
    });
  });

  describe('Font Constants', () => {
    it('should have correct font sizes', () => {
      expect(bkashFontSizes.xs).toBe('0.75rem');
      expect(bkashFontSizes.base).toBe('1rem');
      expect(bkashFontSizes['2xl']).toBe('1.5rem');
    });

    it('should have correct font weights', () => {
      expect(bkashFontWeights.normal).toBe('400');
      expect(bkashFontWeights.medium).toBe('500');
      expect(bkashFontWeights.bold).toBe('700');
    });
  });

  describe('getBkashButtonStyles', () => {
    it('should return primary button styles', () => {
      const styles = getBkashButtonStyles('primary');
      expect(styles.backgroundColor).toBe(bkashColors.primary);
      expect(styles.color).toBe(bkashColors.secondary);
      expect(styles.padding).toBe(`${bkashSpacing.md} ${bkashSpacing.xl}`);
    });

    it('should return secondary button styles', () => {
      const styles = getBkashButtonStyles('secondary');
      expect(styles.backgroundColor).toBe(bkashColors.secondary);
      expect(styles.color).toBe(bkashColors.primary);
      expect(styles.border).toContain(bkashColors.primary);
    });

    it('should return success button styles', () => {
      const styles = getBkashButtonStyles('success');
      expect(styles.backgroundColor).toBe(bkashColors.success);
      expect(styles.color).toBe(bkashColors.secondary);
    });

    it('should return error button styles', () => {
      const styles = getBkashButtonStyles('error');
      expect(styles.backgroundColor).toBe(bkashColors.error);
      expect(styles.color).toBe(bkashColors.secondary);
    });

    it('should return outline button styles', () => {
      const styles = getBkashButtonStyles('outline');
      expect(styles.backgroundColor).toBe('transparent');
      expect(styles.color).toBe(bkashColors.primary);
      expect(styles.border).toContain(bkashColors.primary);
    });

    it('should default to primary variant', () => {
      const defaultStyles = getBkashButtonStyles();
      const primaryStyles = getBkashButtonStyles('primary');
      expect(defaultStyles.backgroundColor).toBe(primaryStyles.backgroundColor);
    });
  });

  describe('getBkashInputStyles', () => {
    it('should return default input styles', () => {
      const styles = getBkashInputStyles('default');
      expect(styles.padding).toBe(`${bkashSpacing.md} ${bkashSpacing.lg}`);
      expect(styles.borderRadius).toBe(bkashBorderRadius.lg);
      expect(styles.border).toContain(bkashColors.gray[300]);
    });

    it('should return focus input styles', () => {
      const styles = getBkashInputStyles('focus');
      expect(styles.borderColor).toBe(bkashColors.primary);
      expect(styles.boxShadow).toContain(bkashColors.primary);
    });

    it('should return error input styles', () => {
      const styles = getBkashInputStyles('error');
      expect(styles.borderColor).toBe(bkashColors.error);
      expect(styles.boxShadow).toContain(bkashColors.error);
    });

    it('should return success input styles', () => {
      const styles = getBkashInputStyles('success');
      expect(styles.borderColor).toBe(bkashColors.success);
      expect(styles.boxShadow).toContain(bkashColors.success);
    });
  });

  describe('getBkashCardStyles', () => {
    it('should return basic card styles', () => {
      const styles = getBkashCardStyles(false);
      expect(styles.backgroundColor).toBe(bkashColors.background.primary);
      expect(styles.borderRadius).toBe(bkashBorderRadius.xl);
      expect(styles.boxShadow).toBe(bkashShadows.sm);
    });

    it('should return elevated card styles', () => {
      const styles = getBkashCardStyles(true);
      expect(styles.boxShadow).toBe(bkashShadows.lg);
    });
  });

  describe('getBkashAlertStyles', () => {
    it('should return success alert styles', () => {
      const styles = getBkashAlertStyles('success');
      expect(styles.backgroundColor).toBe(bkashColors.successLight);
      expect(styles.color).toBe(bkashColors.successDark);
      expect(styles.border).toContain(bkashColors.success);
    });

    it('should return error alert styles', () => {
      const styles = getBkashAlertStyles('error');
      expect(styles.backgroundColor).toBe(bkashColors.errorLight);
      expect(styles.color).toBe(bkashColors.errorDark);
      expect(styles.border).toContain(bkashColors.error);
    });

    it('should return warning alert styles', () => {
      const styles = getBkashAlertStyles('warning');
      expect(styles.backgroundColor).toBe(bkashColors.warningLight);
      expect(styles.color).toBe(bkashColors.warningDark);
      expect(styles.border).toContain(bkashColors.warning);
    });

    it('should return info alert styles', () => {
      const styles = getBkashAlertStyles('info');
      expect(styles.backgroundColor).toBe(bkashColors.infoLight);
      expect(styles.color).toBe(bkashColors.infoDark);
      expect(styles.border).toContain(bkashColors.info);
    });

    it('should default to info variant', () => {
      const defaultStyles = getBkashAlertStyles();
      const infoStyles = getBkashAlertStyles('info');
      expect(defaultStyles.backgroundColor).toBe(infoStyles.backgroundColor);
    });
  });

  describe('bkashSpinnerStyles', () => {
    it('should have correct spinner styles', () => {
      expect(bkashSpinnerStyles.width).toBe('20px');
      expect(bkashSpinnerStyles.height).toBe('20px');
      expect(bkashSpinnerStyles.borderTop).toContain(bkashColors.primary);
      expect(bkashSpinnerStyles.borderRadius).toBe('50%');
    });
  });

  describe('generateBkashCSSVariables', () => {
    it('should generate CSS custom properties', () => {
      const cssVars = generateBkashCSSVariables();
      expect(cssVars).toContain('--bkash-primary');
      expect(cssVars).toContain(bkashColors.primary);
      expect(cssVars).toContain('--bkash-spacing-lg');
      expect(cssVars).toContain(bkashSpacing.lg);
    });

    it('should include all major theme variables', () => {
      const cssVars = generateBkashCSSVariables();
      expect(cssVars).toContain('--bkash-primary-dark');
      expect(cssVars).toContain('--bkash-success');
      expect(cssVars).toContain('--bkash-error');
      expect(cssVars).toContain('--bkash-border-radius');
      expect(cssVars).toContain('--bkash-shadow');
    });
  });
});