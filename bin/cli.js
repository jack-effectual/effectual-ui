#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

class EffectualUI {
  constructor() {
    this.configPath = path.join(process.cwd(), '.effectual-ui.json')
    this.registryUrl = 'https://raw.githubusercontent.com/jack-effectual/effectual-ui/main/registry'
    this.authEndpoint = 'https://auth.effectual.com' // We'll build this later
    this.config = this.loadConfig()
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
      }
    } catch (error) {
      // Config doesn't exist or is invalid
    }
    return {}
  }

  saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
  }

  async validateToken(token) {
    // For now, let's use a simple token validation
    // In production, this would hit your auth service
    const validTokens = [
      'effectual_dev_token_123',
      'effectual_prod_token_456'
    ]
    
    return validTokens.includes(token)
  }

  async authenticate() {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      rl.question('Enter your Effectual UI access token: ', async (token) => {
        rl.close()
        
        const isValid = await this.validateToken(token)
        if (isValid) {
          this.config.token = token
          this.saveConfig()
          console.log('✅ Authentication successful!')
          resolve(true)
        } else {
          console.error('❌ Invalid token')
          resolve(false)
        }
      })
    })
  }

  async downloadComponent(componentName) {
    return new Promise((resolve, reject) => {
      const url = `${this.registryUrl}/components/${componentName}.json`
      
      https.get(url, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data))
            } catch (error) {
              reject(new Error(`Invalid component data for ${componentName}`))
            }
          } else {
            reject(new Error(`Component ${componentName} not found`))
          }
        })
      }).on('error', (error) => {
        reject(error)
      })
    })
  }

  async installComponent(componentName) {
    // Check authentication
    if (!this.config.token) {
      console.log('🔐 Authentication required. Please run: npx effectual-ui auth')
      return
    }

    const isValid = await this.validateToken(this.config.token)
    if (!isValid) {
      console.error('❌ Token expired or invalid. Please re-authenticate.')
      return
    }

    try {
      console.log(`📦 Installing component: ${componentName}`)
      
      // Download component data
      const componentData = await this.downloadComponent(componentName)
      
      // Install NPM dependencies
      if (componentData.dependencies && componentData.dependencies.length > 0) {
        console.log(`📥 Installing dependencies: ${componentData.dependencies.join(', ')}`)
        try {
          execSync(`npm install ${componentData.dependencies.join(' ')}`, { 
            stdio: 'inherit',
            cwd: process.cwd()
          })
        } catch (error) {
          console.warn('⚠️  Some dependencies may have failed to install')
        }
      }

      // Create component files
      for (const file of componentData.files) {
        const targetPath = file.target || `src/components/ui/${file.name}`
        const fullPath = path.join(process.cwd(), targetPath)
        const dir = path.dirname(fullPath)
        
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        // Write component file
        fs.writeFileSync(fullPath, file.content)
        console.log(`✅ Created: ${targetPath}`)
      }

      // Update utils if needed
      await this.ensureUtils()
      
      console.log(`🎉 Successfully installed ${componentName}!`)
      console.log(`\n📝 Next steps:`)
      console.log(`   1. Make sure you have Tailwind CSS configured`)
      console.log(`   2. Import and use: import { ${componentData.name.charAt(0).toUpperCase() + componentData.name.slice(1)} } from '@/components/ui/${componentName}'`)
      
    } catch (error) {
      console.error(`❌ Failed to install ${componentName}:`, error.message)
    }
  }

  async ensureUtils() {
    const utilsPath = path.join(process.cwd(), 'src/lib/utils.ts')
    
    if (!fs.existsSync(utilsPath)) {
      const utilsContent = `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
      
      const dir = path.dirname(utilsPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      fs.writeFileSync(utilsPath, utilsContent)
      console.log('✅ Created: src/lib/utils.ts')
      
      // Install required dependencies for utils
      try {
        execSync('npm install clsx tailwind-merge', { stdio: 'inherit' })
      } catch (error) {
        console.warn('⚠️  Please install: npm install clsx tailwind-merge')
      }
    }
  }

  async listComponents() {
    if (!this.config.token) {
      console.log('🔐 Authentication required. Please run: npx effectual-ui auth')
      return
    }

    console.log('\n📦 Available Effectual UI Components:')
    console.log('  • button - Customizable button with variants')
    console.log('\n💡 Install with: npx effectual-ui add <component-name>')
  }

  showHelp() {
    console.log(`
🎨 Effectual UI - Component Library CLI

Usage:
  npx effectual-ui <command> [options]

Commands:
  auth                    Authenticate with Effectual UI registry
  add <component>         Install a component 
  list                    List available components
  help                    Show this help message

Examples:
  npx effectual-ui auth
  npx effectual-ui add button
  npx effectual-ui list

Need help? Visit: https://github.com/jack-effectual/effectual-ui
`)
  }
}

// CLI execution
async function main() {
  const cli = new EffectualUI()
  const command = process.argv[2]
  const argument = process.argv[3]

  switch (command) {
    case 'auth':
      await cli.authenticate()
      break
    
    case 'add':
      if (!argument) {
        console.error('❌ Please specify a component name')
        console.log('Usage: npx effectual-ui add <component-name>')
        process.exit(1)
      }
      await cli.installComponent(argument)
      break
    
    case 'list':
      await cli.listComponents()
      break
    
    case 'help':
    case '--help':
    case '-h':
      cli.showHelp()
      break
    
    default:
      console.error(`❌ Unknown command: ${command}`)
      cli.showHelp()
      process.exit(1)
  }
}

// Run CLI
if (require.main === module) {
  main().catch(console.error)
}