const fs = require('fs')
const path = require('path')

class RegistryGenerator {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.registryDir = path.join(__dirname, '../registry')
    this.componentsDir = path.join(this.registryDir, 'components')
    this.generatedComponents = []
  }

  generateComponentRegistry(componentPath, componentName, type = 'components:ui') {
    const fullPath = path.join(this.srcDir, componentPath)
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Component file not found: ${fullPath}`)
      return false
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    
    // Extract dependencies from imports
    const dependencies = this.extractDependencies(content)
    
    const registryEntry = {
      name: componentName,
      type: type,
      description: `${componentName.charAt(0).toUpperCase() + componentName.slice(1)} component`,
      version: "0.1.0",
      dependencies: dependencies.external,
      devDependencies: [],
      registryDependencies: dependencies.internal,
      files: [
        {
          name: `${componentName}.tsx`,
          content: content,
          target: `src/components/ui/${componentName}.tsx`
        }
      ],
      tailwind: {
        config: {
          theme: {
            extend: {}
          }
        }
      },
      meta: {
        source: componentPath,
        generatedAt: new Date().toISOString()
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
      version: registryEntry.version
    })
    
    console.log(`✅ Generated registry for ${componentName}`)
    return true
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
      generatedAt: new Date().toISOString(),
      registryUrl: "https://jack-effectual.github.io/effectual-ui"
    }

    const indexFile = path.join(this.registryDir, 'index.json')
    fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2))
    
    console.log(`✅ Generated registry index with ${this.generatedComponents.length} components`)
  }

  generateAllComponents() {
    // Ensure registry directories exist
    if (!fs.existsSync(this.componentsDir)) {
      fs.mkdirSync(this.componentsDir, { recursive: true })
    }

    console.log('🔄 Generating component registry...')

    // Generate registry for existing components
    const componentConfigs = [
      { path: 'components/ui/button.tsx', name: 'button', type: 'components:ui' }
    ]

    let successCount = 0
    componentConfigs.forEach(config => {
      if (this.generateComponentRegistry(config.path, config.name, config.type)) {
        successCount++
      }
    })

    // Generate index file - THIS IS IMPORTANT!
    this.generateIndex()
    
    console.log(`🎉 Registry generation complete! Generated ${successCount}/${componentConfigs.length} components`)
  }
}

// Run the generator
if (require.main === module) {
  const generator = new RegistryGenerator()
  generator.generateAllComponents()
} else {
  module.exports = RegistryGenerator
}