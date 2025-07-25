#!/usr/bin/env node

/**
 * Generate secure random secrets for JWT and encryption
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
}

console.log('🔐 Generating secure secrets for your .env file:\n');
console.log(`JWT_SECRET=${generateSecret(32)}`);
console.log(`ENCRYPTION_KEY=${generateSecret(32)}`);
console.log('\n✅ Copy these values to your .env file (NOT .env.example!)');
console.log('⚠️  Keep these values secret and never commit them to Git!');