const fs = require('fs')
const path = require('path')

function generateExports() {
  const srcDir = path.join(__dirname, '../src')
  const uiComponentsDir = path.join(srcDir, 'components/ui')
  
  if (!fs.existsSync(uiComponentsDir)) {
    return
  }

  const componentFiles = fs.readdirSync(uiComponentsDir)
    .filter(file => file.endsWith('.tsx'))
    .filter(file => file !== 'index.tsx')

  let exportsContent = '// Auto-generated exports - do not edit manually\n\n'
  
  // Generate component exports
  exportsContent += '// UI Components\n'
  componentFiles.forEach(file => {
    const componentName = path.basename(file, '.tsx')
    const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1)
    
    exportsContent += `export { ${capitalizedName} } from './components/ui/${componentName}'\n`
    
    // Also export types and variants if they exist
    const content = fs.readFileSync(path.join(uiComponentsDir, file), 'utf8')
    if (content.includes(`export.*${capitalizedName}Props`)) {
      exportsContent += `export type { ${capitalizedName}Props } from './components/ui/${componentName}'\n`
    }
    if (content.includes(`${componentName}Variants`)) {
      exportsContent += `export { ${componentName}Variants } from './components/ui/${componentName}'\n`
    }
  })

  // Add utilities and other exports
  exportsContent += '\n// Utilities\n'
  exportsContent += 'export { cn, generateComponentId, formatDate } from \'./lib/utils\'\n'
  exportsContent += '\n// Package info\n'
  exportsContent += 'export const version = \'0.1.0\'\n'
  exportsContent += 'export const cliCommand = \'npx effectual-ui\'\n'

  // Write the file
  const indexPath = path.join(srcDir, 'index.ts')
  fs.writeFileSync(indexPath, exportsContent)
  
  console.log(`✅ Generated exports for ${componentFiles.length} components`)
}

if (require.main === module) {
  generateExports()
} else {
  module.exports = generateExports
}