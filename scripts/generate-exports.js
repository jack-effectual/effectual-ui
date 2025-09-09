const fs = require('fs')
const path = require('path')

class ExportsGenerator {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.uiComponentsDir = path.join(this.srcDir, 'components/ui')
    this.customComponentsDir = path.join(this.srcDir, 'components/custom')
  }

  discoverComponents(directory, type) {
    if (!fs.existsSync(directory)) {
      return []
    }

    const componentFiles = fs.readdirSync(directory)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.endsWith('.test.tsx') && !file.endsWith('.stories.tsx'))
      .filter(file => file !== 'index.ts' && file !== 'index.tsx')

    return componentFiles.map(file => {
      const componentName = path.basename(file, path.extname(file))
      const filePath = path.join(directory, file)
      const content = fs.readFileSync(filePath, 'utf8')
      
      return {
        name: componentName,
        file: file,
        type: type,
        path: `./components/${type}/${componentName}`,
        exports: this.extractExports(content, componentName)
      }
    })
  }

  extractExports(content, componentName) {
    const exports = {
      component: null,
      props: null,
      variants: null,
      other: []
    }

    // Find main component export
    const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1)
    if (content.includes(`const ${capitalizedName} =`) || content.includes(`function ${capitalizedName}`)) {
      exports.component = capitalizedName
    }

    // Find props interface
    if (content.includes(`interface ${capitalizedName}Props`) || content.includes(`type ${capitalizedName}Props`)) {
      exports.props = `${capitalizedName}Props`
    }

    // Find variants export
    if (content.includes(`${componentName}Variants`)) {
      exports.variants = `${componentName}Variants`
    }

    // Find other named exports
    const exportMatches = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g)
    for (const match of exportMatches) {
      const exportName = match[1]
      if (exportName !== exports.component && 
          exportName !== exports.props && 
          exportName !== exports.variants) {
        exports.other.push(exportName)
      }
    }

    return exports
  }

  generateExportsFile() {
    console.log('🔄 Auto-generating exports...')

    // Discover all components
    const uiComponents = this.discoverComponents(this.uiComponentsDir, 'ui')
    const customComponents = this.discoverComponents(this.customComponentsDir, 'custom')
    const allComponents = [...uiComponents, ...customComponents]

    if (allComponents.length === 0) {
      console.log('⚠️  No components found for export generation')
      return
    }

    console.log(`📦 Found ${allComponents.length} components to export`)

    let exportsContent = `// Auto-generated exports - do not edit manually
// Generated at: ${new Date().toISOString()}
// Components: ${allComponents.map(c => c.name).join(', ')}

`

    // Generate UI component exports
    const uiComps = allComponents.filter(c => c.type === 'ui')
    if (uiComps.length > 0) {
      exportsContent += '// ===== UI Components =====\n'
      uiComps.forEach(comp => {
        const exports = []
        
        if (comp.exports.component) {
          exports.push(comp.exports.component)
        }
        
        if (comp.exports.variants) {
          exports.push(comp.exports.variants)
        }
        
        if (comp.exports.other.length > 0) {
          exports.push(...comp.exports.other)
        }
        
        if (exports.length > 0) {
          exportsContent += `export { ${exports.join(', ')} } from '${comp.path}'\n`
        }
        
        if (comp.exports.props) {
          exportsContent += `export type { ${comp.exports.props} } from '${comp.path}'\n`
        }
      })
      exportsContent += '\n'
    }

    // Generate custom component exports  
    const customComps = allComponents.filter(c => c.type === 'custom')
    if (customComps.length > 0) {
      exportsContent += '// ===== Custom Components =====\n'
      customComps.forEach(comp => {
        const exports = []
        
        if (comp.exports.component) {
          exports.push(comp.exports.component)
        }
        
        if (comp.exports.other.length > 0) {
          exports.push(...comp.exports.other)
        }
        
        if (exports.length > 0) {
          exportsContent += `export { ${exports.join(', ')} } from '${comp.path}'\n`
        }
        
        if (comp.exports.props) {
          exportsContent += `export type { ${comp.exports.props} } from '${comp.path}'\n`
        }
      })
      exportsContent += '\n'
    }

    // Add utility exports
    exportsContent += `// ===== Utilities =====
export { cn, generateComponentId, formatDate } from './lib/utils'

// ===== Package Info =====
export const version = '0.1.0'
export const cliCommand = 'npx effectual-ui'

// ===== Component Count =====
export const componentCount = ${allComponents.length}
export const uiComponentCount = ${uiComps.length}
export const customComponentCount = ${customComps.length}
`

    // Write the exports file
    const indexPath = path.join(this.srcDir, 'index.ts')
    fs.writeFileSync(indexPath, exportsContent)
    
    console.log(`✅ Generated exports for ${allComponents.length} components`)
    console.log(`   • UI Components: ${uiComps.length}`)
    console.log(`   • Custom Components: ${customComps.length}`)
    
    // Show what was exported
    allComponents.forEach(comp => {
      const exportsList = [
        comp.exports.component,
        comp.exports.props ? `${comp.exports.props} (type)` : null,
        comp.exports.variants,
        ...comp.exports.other
      ].filter(Boolean)
      
      if (exportsList.length > 0) {
        console.log(`   • ${comp.name}: ${exportsList.join(', ')}`)
      }
    })
  }
}

// Run the generator
if (require.main === module) {
  const generator = new ExportsGenerator()
  generator.generateExportsFile()
} else {
  module.exports = ExportsGenerator
}