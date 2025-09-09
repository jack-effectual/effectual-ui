const fs = require('fs')
const path = require('path')

class RegistryGenerator {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.registryDir = path.join(__dirname, '../registry')
    this.componentsDir = path.join(this.registryDir, 'components')
    this.generatedComponents = []
  }

  /**
   * Automatically discover all component files in src/components/ui/
   */
  discoverComponents() {
    const uiComponentsDir = path.join(this.srcDir, 'components/ui')
    
    if (!fs.existsSync(uiComponentsDir)) {
      console.log('No UI components directory found')
      return []
    }

    const componentFiles = fs.readdirSync(uiComponentsDir)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.endsWith('.test.tsx') && !file.endsWith('.stories.tsx'))
      .filter(file => file !== 'index.ts') // Skip index files

    const discoveredComponents = componentFiles.map(file => {
      const componentName = path.basename(file, path.extname(file))
      const componentPath = path.join('components/ui', file)
      
      return {
        name: componentName,
        path: componentPath,
        type: 'components:ui'
      }
    })

    console.log(`🔍 Discovered ${discoveredComponents.length} components:`)
    discoveredComponents.forEach(comp => {
      console.log(`   • ${comp.name} (${comp.path})`)
    })

    return discoveredComponents
  }

  /**
   * Also discover custom components in src/components/custom/
   */
  discoverCustomComponents() {
    const customComponentsDir = path.join(this.srcDir, 'components/custom')
    
    if (!fs.existsSync(customComponentsDir)) {
      return []
    }

    const componentFiles = fs.readdirSync(customComponentsDir)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.endsWith('.test.tsx') && !file.endsWith('.stories.tsx'))
      .filter(file => file !== 'index.ts')

    const discoveredComponents = componentFiles.map(file => {
      const componentName = path.basename(file, path.extname(file))
      const componentPath = path.join('components/custom', file)
      
      return {
        name: componentName,
        path: componentPath,
        type: 'components:custom'
      }
    })

    if (discoveredComponents.length > 0) {
      console.log(`🔍 Discovered ${discoveredComponents.length} custom components:`)
      discoveredComponents.forEach(comp => {
        console.log(`   • ${comp.name} (${comp.path})`)
      })
    }

    return discoveredComponents
  }

  generateComponentRegistry(componentPath, componentName, type = 'components:ui') {
    const fullPath = path.join(this.srcDir, componentPath)
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Component file not found: ${fullPath}`)
      return false
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    
    // Extract metadata from the component
    const metadata = this.extractComponentMetadata(content, componentName)
    
    const registryEntry = {
      name: componentName,
      type: type,
      description: metadata.description,
      version: "0.1.0",
      dependencies: metadata.dependencies.external,
      devDependencies: [],
      registryDependencies: metadata.dependencies.internal,
      files: [
        {
          name: `${componentName}.tsx`,
          content: content,
          target: `src/components/${type === 'components:ui' ? 'ui' : 'custom'}/${componentName}.tsx`
        }
      ],
      tailwind: {
        config: {
          theme: {
            extend: metadata.tailwindVars || {}
          }
        }
      },
      meta: {
        source: componentPath,
        generatedAt: new Date().toISOString(),
        exports: metadata.exports,
        hasVariants: metadata.hasVariants,
        hasSizes: metadata.hasSizes
      }
    }

    // Write registry file
    const registryFile = path.join(this.componentsDir, `${componentName}.json`)
    fs.writeFileSync(registryFile, JSON.stringify(registryEntry, null, 2))
    
    // Add to generated components list
    this.generatedComponents.push({
      name: componentName,
      type: type,
      description: registryEntry.description,
      version: registryEntry.version,
      hasVariants: metadata.hasVariants,
      hasSizes: metadata.hasSizes
    })
    
    console.log(`✅ Generated registry for ${componentName}`)
    return true
  }

  /**
   * Extract comprehensive metadata from component source code
   */
  extractComponentMetadata(content, componentName) {
    const metadata = {
      description: null,
      dependencies: { external: [], internal: [] },
      exports: [],
      hasVariants: false,
      hasSizes: false,
      tailwindVars: {}
    }

    // Extract JSDoc description
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/s)
    if (jsdocMatch) {
      metadata.description = jsdocMatch[1].trim()
    } else {
      // Generate smart description
      metadata.description = this.generateSmartDescription(componentName, content)
    }

    // Extract dependencies
    metadata.dependencies = this.extractDependencies(content)

    // Extract exports
    const exportMatches = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g)
    metadata.exports = Array.from(exportMatches, match => match[1])

    // Check for variants and sizes
    metadata.hasVariants = content.includes('variants:') && content.includes('variant:')
    metadata.hasSizes = content.includes('size:') && content.includes('sizes')

    // Extract Tailwind CSS variables
    const cssVarMatches = content.matchAll(/--[\w-]+/g)
    if (cssVarMatches) {
      Array.from(cssVarMatches).forEach(match => {
        const varName = match[0]
        metadata.tailwindVars[varName] = `hsl(var(${varName}))`
      })
    }

    return metadata
  }

  generateSmartDescription(componentName, content) {
    // Analyze the component content to generate a description
    const descriptions = {
      button: "A customizable button component with multiple variants and sizes",
      input: "A form input component with validation states and custom styling", 
      card: "A flexible card component for content organization and layout",
      dialog: "A modal dialog component built on Radix UI primitives",
      select: "A select dropdown component with search and multi-select capabilities",
      textarea: "A multi-line text input component with auto-resize functionality",
      checkbox: "A checkbox input component with indeterminate state support",
      radio: "A radio button input component for single-selection forms",
      switch: "A toggle switch component for boolean settings",
      slider: "A range slider component for numeric value selection",
      progress: "A progress bar component for showing completion status",
      avatar: "An avatar component for displaying user profile images",
      badge: "A small badge component for labels and status indicators",
      alert: "An alert component for displaying important messages",
      tooltip: "A tooltip component for providing contextual information"
    }

    if (descriptions[componentName]) {
      return descriptions[componentName]
    }

    // Analyze content for clues
    if (content.includes('forwardRef') && content.includes('input')) {
      return `A form ${componentName} input component with custom styling`
    }
    
    if (content.includes('variant') && content.includes('size')) {
      return `A customizable ${componentName} component with multiple variants and sizes`
    }

    if (content.includes('Radix')) {
      return `A ${componentName} component built on Radix UI primitives`
    }

    return `${componentName.charAt(0).toUpperCase() + componentName.slice(1)} component`
  }

  extractDependencies(content) {
    const externalDeps = new Set()
    const internalDeps = new Set()
    
    // Extract import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      
      if (importPath.startsWith('@/')) {
        // Internal dependency (other components from our library)
        const componentName = path.basename(importPath)
        if (componentName !== 'utils' && componentName !== 'types') {
          internalDeps.add(componentName)
        }
      } else if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        // External NPM dependency
        const packageName = importPath.startsWith('@') 
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0]
        externalDeps.add(packageName)
      }
    }

    return {
      external: Array.from(externalDeps).filter(dep => 
        !['react', 'react-dom'].includes(dep) // Exclude peer dependencies
      ),
      internal: Array.from(internalDeps)
    }
  }

  generateIndex() {
    const indexData = {
      name: "@effectual/ui",
      version: "0.1.0",
      description: "Effectual component library registry",
      components: this.generatedComponents,
      stats: {
        totalComponents: this.generatedComponents.length,
        uiComponents: this.generatedComponents.filter(c => c.type === 'components:ui').length,
        customComponents: this.generatedComponents.filter(c => c.type === 'components:custom').length,
        componentsWithVariants: this.generatedComponents.filter(c => c.hasVariants).length,
        componentsWithSizes: this.generatedComponents.filter(c => c.hasSizes).length
      },
      generatedAt: new Date().toISOString(),
      registryUrl: "https://jack-effectual.github.io/effectual-ui"
    }

    const indexFile = path.join(this.registryDir, 'index.json')
    fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2))
    
    console.log(`✅ Generated registry index with ${this.generatedComponents.length} components`)
    console.log(`📊 Stats: ${indexData.stats.uiComponents} UI, ${indexData.stats.customComponents} custom, ${indexData.stats.componentsWithVariants} with variants`)
  }

  /**
   * Clean up old registry files for components that no longer exist
   */
  cleanupOldComponents() {
    if (!fs.existsSync(this.componentsDir)) {
      return
    }

    const existingRegistryFiles = fs.readdirSync(this.componentsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'))

    const currentComponents = this.generatedComponents.map(c => c.name)
    
    const obsoleteComponents = existingRegistryFiles.filter(name => 
      !currentComponents.includes(name)
    )

    obsoleteComponents.forEach(componentName => {
      const filePath = path.join(this.componentsDir, `${componentName}.json`)
      fs.unlinkSync(filePath)
      console.log(`🗑️  Removed obsolete component: ${componentName}`)
    })

    if (obsoleteComponents.length > 0) {
      console.log(`✅ Cleaned up ${obsoleteComponents.length} obsolete components`)
    }
  }

  generateAllComponents() {
    // Ensure registry directories exist
    if (!fs.existsSync(this.componentsDir)) {
      fs.mkdirSync(this.componentsDir, { recursive: true })
    }

    console.log('🔄 Auto-discovering components...')

    // Discover all components automatically
    const uiComponents = this.discoverComponents()
    const customComponents = this.discoverCustomComponents()
    const allComponents = [...uiComponents, ...customComponents]

    if (allComponents.length === 0) {
      console.log('⚠️  No components found to generate registry for')
      return
    }

    console.log(`\n📦 Generating registry for ${allComponents.length} components...`)

    // Generate registry for each discovered component
    let successCount = 0
    allComponents.forEach(component => {
      if (this.generateComponentRegistry(component.path, component.name, component.type)) {
        successCount++
      }
    })

    // Clean up old component files
    this.cleanupOldComponents()

    // Generate index file
    this.generateIndex()
    
    console.log(`\n🎉 Registry generation complete!`)
    console.log(`✅ Successfully generated ${successCount}/${allComponents.length} components`)
    
    if (successCount !== allComponents.length) {
      console.log(`⚠️  ${allComponents.length - successCount} components failed to generate`)
    }
  }
}

// Run the generator
if (require.main === module) {
  const generator = new RegistryGenerator()
  generator.generateAllComponents()
} else {
  module.exports = RegistryGenerator
}