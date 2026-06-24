import localFont from 'next/font/local';

export const notoSansArabic = localFont({
  src: [
    {
      path: './fonts/NotoSansArabic-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Bold.woff2',
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
      path: './fonts/Rubik-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Bold.woff2',
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
      path: './fonts/Zain-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Zain-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Zain-Bold.woff2',
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
      path: './fonts/NotoSansArabic-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/NotoSansArabic-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Rubik-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-primary-next',
  display: 'swap',
  preload: true,
});
