import fs from 'fs';
import path from 'path';

const FONTS_DIR = path.join(process.cwd(), 'public/fonts');
const LAYOUT_FILE = path.join(process.cwd(), 'app/layout.tsx');

const REQUIRED_FONTS = [
  'NotoSansArabic-Light.ttf',
  'NotoSansArabic-Regular.ttf',
  'NotoSansArabic-Medium.ttf',
  'NotoSansArabic-SemiBold.ttf',
  'NotoSansArabic-Bold.ttf',
  'Rubik-Light.ttf',
  'Rubik-Regular.ttf',
  'Rubik-Medium.ttf',
  'Rubik-SemiBold.ttf',
  'Rubik-Bold.ttf',
  'Zain-Light.ttf',
  'Zain-Regular.ttf',
  'Zain-Bold.ttf',
];

const PRELOAD_FONTS = [
  'NotoSansArabic-Regular.ttf',
  'Rubik-Regular.ttf',
  'NotoSansArabic-SemiBold.ttf',
  'Rubik-SemiBold.ttf',
];

async function verifyFonts() {
  console.log('🔍 Starting Font Verification...\n');
  let errors = 0;

  // 1. Check Font Files Existence and Size
  console.log('📁 Checking Font Files:');
  if (!fs.existsSync(FONTS_DIR)) {
    console.error('❌ Fonts directory missing: ' + FONTS_DIR);
    process.exit(1);
  }

  REQUIRED_FONTS.forEach((font) => {
    const filePath = path.join(FONTS_DIR, font);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = stats.size / 1024;
      
      let status = '✅';
      if (sizeKB > 300) {
        status = '⚠️ (Large)';
      } else if (sizeKB < 10) {
        status = '❌ (Too small/Corrupt)';
        errors++;
      }

      console.log(`${status} ${font} - ${sizeKB.toFixed(2)} KB`);
    } else {
      console.error(`❌ Missing: ${font}`);
      errors++;
    }
  });

  // 2. Check Preload Links in Layout
  console.log('\n🔗 Checking Preload Links in Layout:');
  if (fs.existsSync(LAYOUT_FILE)) {
    const layoutContent = fs.readFileSync(LAYOUT_FILE, 'utf8');
    PRELOAD_FONTS.forEach((font) => {
      const preloadTag = `rel="preload" href="/fonts/${font}"`;
      if (layoutContent.includes(preloadTag)) {
        console.log(`✅ Found preload for ${font}`);
      } else {
        console.error(`❌ Preload missing for ${font}`);
        errors++;
      }
    });
  } else {
    console.error('❌ Layout file missing: ' + LAYOUT_FILE);
    errors++;
  }

  // 3. Final Report
  console.log('\n📊 Final Report:');
  if (errors === 0) {
    console.log('✨ All fonts verified successfully! Ready for production.');
  } else {
    console.error(`🛑 Found ${errors} error(s). Please fix them before proceeding.`);
    process.exit(1);
  }
}

verifyFonts().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
