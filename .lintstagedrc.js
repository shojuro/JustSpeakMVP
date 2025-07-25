// Advanced lint-staged configuration with performance optimizations

const micromatch = require('micromatch')

module.exports = (allStagedFiles) => {
  const commands = []
  
  // Filter files by type for efficient processing
  const jsFiles = micromatch(allStagedFiles, ['**/*.{js,jsx,ts,tsx}'])
  const tsFiles = micromatch(allStagedFiles, ['**/*.{ts,tsx}'])
  const styleFiles = micromatch(allStagedFiles, ['**/*.{css,scss}'])
  const jsonFiles = micromatch(allStagedFiles, ['**/*.json'])
  const mdFiles = micromatch(allStagedFiles, ['**/*.{md,mdx}'])
  
  // JavaScript/TypeScript files: Prettier first, then ESLint
  if (jsFiles.length > 0) {
    commands.push(`prettier --write ${jsFiles.join(' ')}`)
    commands.push(`eslint --fix --max-warnings=0 ${jsFiles.join(' ')}`)
  }
  
  // Style files
  if (styleFiles.length > 0) {
    commands.push(`prettier --write ${styleFiles.join(' ')}`)
  }
  
  // JSON files
  if (jsonFiles.length > 0) {
    commands.push(`prettier --write ${jsonFiles.join(' ')}`)
  }
  
  // Markdown files
  if (mdFiles.length > 0) {
    commands.push(`prettier --write ${mdFiles.join(' ')}`)
  }
  
  // TypeScript type checking with smart thresholds
  // Only run full type check if many TS files changed or critical files
  if (tsFiles.length > 0) {
    const criticalFiles = tsFiles.filter(file => 
      file.includes('/types/') || 
      file.includes('/lib/') ||
      file.includes('tsconfig')
    )
    
    // If more than 10 TS files or critical files changed, run full type check
    if (tsFiles.length > 10 || criticalFiles.length > 0) {
      commands.push('tsc --noEmit --skipLibCheck')
    } else {
      // For smaller changes, run incremental type check
      commands.push('tsc --noEmit --incremental --skipLibCheck')
    }
  }
  
  return commands
}

// Note: This optimized configuration:
// 1. Filters files efficiently using micromatch
// 2. Batches commands by file type to reduce overhead
// 3. Uses smart TypeScript checking based on file count and criticality
// 4. Maintains proper order: formatting before linting
// 5. Avoids running commands when no relevant files are staged
