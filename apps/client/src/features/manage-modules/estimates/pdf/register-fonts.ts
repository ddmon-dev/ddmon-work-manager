import { Font } from '@react-pdf/renderer';

let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: 'Pretendard',
    fonts: [
      { src: '/fonts/Pretendard-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/Pretendard-Medium.ttf', fontWeight: 'medium' },
      { src: '/fonts/Pretendard-Bold.ttf', fontWeight: 'bold' },
    ],
  });
}
