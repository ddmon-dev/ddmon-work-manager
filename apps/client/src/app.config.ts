import type { SidebarVariant } from '@/shared/ui/sidebar';

export const APP_CONFIG = {
  META: {
    TITLE: 'Work Manager',
    DESCRIPTION: '프리랜서를 위한 외주 관리 시스템',
  },
  AUTH: {
    PATHS: {
      SIGN_IN: '/auth/sign-in',
      FORBIDDEN: '/unauthorized',
    },
    ADMIN_LABELS: {
      SUPER_ADMIN: '최고관리자',
      ADMIN: '일반관리자',
    },
  },
  UI: {
    SIDEBAR: {
      VARIANT: 'sidebar' as SidebarVariant,
      WIDTH: '20rem',
      WIDTH_MD: '15rem',
      WIDTH_MOBILE: '18rem',
      WIDTH_ICON: '3rem',
      COOKIE_NAME: 'sidebar_state',
      KEYBOARD_SHORTCUT: 'b',
    },
    PAGINATION: {
      PAGE_SIZE_OPTIONS: [1, 15, 30, 50, 100],
      MAX_VISIBLE_PAGES: 7,
      MOBILE_MAX_VISIBLE_PAGES: 5,
    },
  },
  UX: {
    MIN_LOADING_TIME: 1000,
  },
  API: {
    BASE: '/api',
    TIMEOUT: 15_000,
  },
} as const;
