const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const originalSchema = fs.readFileSync(schemaPath, 'utf8')

const tempOutput = '../node_modules/.prisma/client-gen'
const targetDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client')
const sourceDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client-gen')

try {
  console.log('1. Setting temporary output in schema.prisma...')
  const modifiedSchema = originalSchema.replace(
    /generator client \{[\s\S]*?\}/,
    `generator client {\n  provider = "prisma-client-js"\n  output   = "${tempOutput}"\n}`
  )
  fs.writeFileSync(schemaPath, modifiedSchema, 'utf8')

  console.log('2. Running npx prisma generate...')
  execSync('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  })

  console.log('3. Copying generated type files into active client...')
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir)
    for (const file of files) {
      if (file.endsWith('.node') || file.endsWith('.dll')) continue
      const srcFile = path.join(sourceDir, file)
      const dstFile = path.join(targetDir, file)
      fs.cpSync(srcFile, dstFile, { recursive: true, force: true })
    }
    console.log('  ✓ Files copied successfully.')
  }
} catch (err) {
  console.error('Error during generation:', err)
} finally {
  console.log('4. Restoring original schema and cleaning up...')
  fs.writeFileSync(schemaPath, originalSchema, 'utf8')
  if (fs.existsSync(sourceDir)) {
    fs.rmSync(sourceDir, { recursive: true, force: true })
  }
  console.log('✓ Done!')
}
