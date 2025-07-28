/**
 * Generate simple placeholder icons for the PWA
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

// Simple SVG icon
const svgIcon = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2563EB"/>
  <circle cx="256" cy="200" r="80" fill="white"/>
  <path d="M176 320 Q256 280 336 320 L336 400 Q256 440 176 400 Z" fill="white"/>
  <circle cx="256" cy="200" r="40" fill="#2563EB"/>
</svg>`

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir)
}

// Save SVG icon
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon)

console.log('✅ Generated icon.svg')
console.log('📌 Note: For production, create proper PNG icons:')
console.log('   - icon-192.png (192x192)')
console.log('   - icon-512.png (512x512)')
console.log('   - apple-touch-icon.png (180x180)')
