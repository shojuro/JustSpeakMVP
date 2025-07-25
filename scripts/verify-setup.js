#!/usr/bin/env node

/**
 * Verify that the development environment is properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Just Speak MVP setup...\n');

// Check for required files
const requiredFiles = [
  '.env',
  '.env.example',
  'package.json',
  'tsconfig.json',
  'tailwind.config.js',
  'next.config.js'
];

let allGood = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allGood = false;
});

// Check for .env variables
console.log('\n🔐 Checking environment variables:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'JWT_SECRET'
  ];
  
  requiredVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`) && 
                   !envContent.includes(`${varName}=\n`) &&
                   !envContent.includes(`${varName}=\r\n`);
    console.log(`  ${hasVar ? '✅' : '❌'} ${varName}`);
    if (!hasVar) allGood = false;
  });
} else {
  console.log('  ❌ .env file not found');
  allGood = false;
}

// Summary
console.log('\n' + '='.repeat(40));
if (allGood) {
  console.log('✅ Setup looks good! Ready to start development.');
  console.log('\nNext steps:');
  console.log('1. Run: npm install (if not done)');
  console.log('2. Run: npm run dev');
  console.log('3. Open: http://localhost:3000');
} else {
  console.log('❌ Some issues found. Please fix them before continuing.');
}
console.log('='.repeat(40));