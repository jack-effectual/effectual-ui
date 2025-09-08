const fs = require('fs')
const path = require('path')

class RegistryGenerator {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.registryDir = path.join(__dirname, '../registry')
    this.componentsDir = path.join(this.registryDir, 'components')
  }

  generateComponentRegistry(componentPath, componentName, type = 'components:ui') {
    const fullPath = path.join(this.srcDir, componentPath)
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Component file not found: ${fullPath}`)
      return
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    
    // Extract dependencies from imports
    const dependencies = this.extractDependencies(content)
    
    const registryEntry = {
      name: componentName,
      type: type,
      description: `${componentName.charAt(0).toUpperCase() + componentName.slice(1)} component`,
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
      }
    }

    // Write registry file
    const registryFile = path.join(this.componentsDir, `${componentName}.json`)
    fs.writeFileSync(registryFile, JSON.stringify(registryEntry, null, 2))
    
    console.log(`✅ Generated registry for ${componentName}`)
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
        if (componentName !== 'utils') {
          internalDeps.add(componentName)
        }
      } else if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        // External NPM dependency
        externalDeps.add(importPath.split('/')[0])
      }
    }

    return {
      external: Array.from(externalDeps),
      internal: Array.from(internalDeps)
    }
  }

  generateAllComponents() {
    // Ensure registry directories exist
    if (!fs.existsSync(this.componentsDir)) {
      fs.mkdirSync(this.componentsDir, { recursive: true })
    }

    // Generate registry for button component
    this.generateComponentRegistry('components/ui/button.tsx', 'button')
    
    console.log('🎉 Registry generation complete!')
  }
}

// Run the generator
const generator = new RegistryGenerator()
generator.generateAllComponents()