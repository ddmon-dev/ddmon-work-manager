import type { SidebarVariant } from '@/shared/ui/sidebar';

export const APP_CONFIG = {
  META: {
    TITLE: 'LittleAwesome WM',
    DESCRIPTION: '외주 고객·견적·프로젝트·수금 관리 시스템',
  },
  AUTH: {
    PATHS: {
      SIGN_IN: '/auth/sign-in',
      FORBIDDEN: '/unauthorized',
    },
    IDLE_TIMEOUT_MINUTES: 30, // 자동 로그아웃 (데모 모드)
    IDLE_WARNING_MINUTES: 5, // 로그아웃 경고 표시 (5분 전)
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
      PAGE_SIZE_OPTIONS: [15, 30, 50, 100],
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
