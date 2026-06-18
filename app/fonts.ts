import localFont from 'next/font/local';

export const notoSansArabic = localFont({
  src: [
    {
      path: './fonts/NotoSansArabic-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-arabic-next',
  display: 'swap',
  preload: false,
});

export const rubik = localFont({
  src: [
    {
      path: './fonts/Rubik-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-english-next',
  display: 'swap',
  preload: false,
});

export const zain = localFont({
  src: [
    {
      path: './fonts/Zain-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Zain-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Zain-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-zain-next',
  display: 'swap',
  preload: false,
});

// خط موحد — preload فقط الأوزان الأساسية (Regular + Bold)
// الأوزان الثانوية (300, 500, 600) تُحمّل عند الحاجة من notoSansArabic / rubik
export const primaryFont = localFont({
  src: [
    {
      path: './fonts/NotoSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-primary-next',
  display: 'swap',
  preload: true,
});
