// Design tokens para el sistema de dashboards
export const DASHBOARD_DESIGN = {
  // Spacing (8px grid)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Typography (Geist font stack)
  typography: {
    hero: 'text-4xl md:text-5xl font-black tracking-tight',
    heading: 'text-2xl md:text-3xl font-bold tracking-tight',
    subheading: 'text-lg font-semibold tracking-tight',
    body: 'text-base leading-6',
    caption: 'text-sm text-muted-foreground leading-5',
    label: 'text-xs font-medium uppercase tracking-wider',
  },

  // Gradients para depth visual
  gradients: {
    primary: 'from-primary/15 via-primary/5 to-transparent',
    success: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    warning: 'from-amber-500/10 via-amber-500/5 to-transparent',
    error: 'from-red-500/10 via-red-500/5 to-transparent',
    neutral: 'from-slate-500/10 via-slate-500/5 to-transparent',
  },

  // Shadows (subtle pero presentes)
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.02)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.02)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  },

  // Border radius (escala consistente)
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },

  // Transitions
  transitions: {
    fast: 'transition-all duration-150 ease-in-out',
    base: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },

  // Colors by context
  colors: {
    saas: {
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500',
    },
    ecommerce: {
      bg: 'from-green-500/10 to-green-500/5',
      border: 'border-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500',
    },
    inventory: {
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
    },
    crm: {
      bg: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-500',
    },
    finance: {
      bg: 'from-red-500/10 to-red-500/5',
      border: 'border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500',
    },
  },
};
