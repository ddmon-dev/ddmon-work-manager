import { Font } from '@react-pdf/renderer';
import regularUrl from '@/shared/assets/fonts/pretendard-regular.woff?url';
import mediumUrl from '@/shared/assets/fonts/pretendard-medium.woff?url';
import boldUrl from '@/shared/assets/fonts/pretendard-bold.woff?url';

let ready: Promise<void> | undefined;

export function registerFonts(): Promise<void> {
  if (ready) return ready;

  const controller = new AbortController();
  // 헤더 수신 후 본문 전송이 멈추는 경우까지 제한한다.
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const urls: string[] = [];
  let registered = false;
  const existingFonts = Object.values(Font.getRegisteredFonts()).map(({ family, sources }) => ({
    family,
    fonts: sources.map(({ src, fontStyle, fontWeight, options }) => ({
      src, fontStyle, fontWeight, ...options,
    })),
  }));
  const fonts = [
    { src: regularUrl, fontWeight: 400 },
    { src: mediumUrl, fontWeight: 500 },
    { src: boldUrl, fontWeight: 700 },
  ];

  ready = (async () => {
    try {
      const loaded = await Promise.all(fonts.map(async (font) => {
        const response = await fetch(font.src, { signal: controller.signal });
        if (!response.ok) throw new Error(`폰트 응답 오류 (${response.status})`);
        const blob = await response.blob();
        if (controller.signal.aborted) throw new Error('폰트 로딩 시간 초과');
        const src = URL.createObjectURL(blob);
        urls.push(src);
        return { ...font, src };
      }));
      // 미완료/실패 요청이 내부 캐시에 남지 않도록 완전히 받은 뒤 등록한다.
      Font.register({ family: 'Pretendard', fonts: loaded });
      registered = true;
      await Promise.all(fonts.map(({ fontWeight }) =>
        Font.load({ fontFamily: 'Pretendard', fontWeight })
      ));
    } catch {
      controller.abort();
      // 실패한 소스 캐시를 비우되 렌더러의 기본 폰트 등록은 복원한다.
      if (registered) {
        Font.clear();
        existingFonts.forEach((font) => Font.register(font));
      }
      ready = undefined;
      throw new Error('견적서 폰트를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      clearTimeout(timeout);
      urls.forEach((url) => URL.revokeObjectURL(url));
    }
  })();
  return ready;
}
