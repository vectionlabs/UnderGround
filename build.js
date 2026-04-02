const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building UnderGround...');

// Build frontend
console.log('📦 Building frontend...');
execSync('npm run build', { stdio: 'inherit' });

// Ensure dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ folder not found after build');
  process.exit(1);
}

// Copy index.html to server root (for Render fallback)
try {
  const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml);
  console.log('✅ Copied index.html to root');
} catch (err) {
  console.error('❌ Failed to copy index.html:', err.message);
}

// Copy dist contents to root (for Render)
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursiveSync(distPath, path.join(__dirname, 'dist'));
  console.log('✅ Frontend built successfully');
} catch (err) {
  console.error('❌ Failed to copy dist:', err.message);
}

console.log('🚀 Build complete!');
