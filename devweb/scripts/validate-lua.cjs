const fs = require('node:fs')
const path = require('node:path')
const luaparse = require('luaparse')

const repositoryRoot = path.resolve(__dirname, '..', '..', '..')
const ignored = new Set(['node_modules', '.git', '.release', 'releases'])

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target, files)
    else if (entry.name.endsWith('.lua')) files.push(target)
  }
  return files
}

const files = walk(repositoryRoot)
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8').replace(/`[^`\r\n]+`/g, '0')
  try {
    luaparse.parse(source, { luaVersion: '5.3' })
  } catch (error) {
    console.error(`${path.relative(repositoryRoot, file)}:${error.message}`)
    process.exitCode = 1
  }
}

if (!process.exitCode) console.log(`Parsed ${files.length} Lua files.`)

