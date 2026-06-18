/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) return env

      const separatorIndex = line.indexOf('=')
      if (separatorIndex === -1) return env

      const key = line.slice(0, separatorIndex).trim()
      let value = line.slice(separatorIndex + 1).trim()
      const quote = value[0]
      if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
        value = value.slice(1, -1)
      }
      env[key] = value
      return env
    }, {})
}

const cwd = '/home/ubuntu/proxy-ops-manager'
const productionEnv = parseEnvFile(path.join(cwd, '.env.production'))

module.exports = {
  apps: [
    {
      name: 'proxy-ops-manager',
      cwd,
      script: 'npm',
      args: 'start',
      env: {
        ...productionEnv,
        NODE_ENV: 'production',
        APP_PORT: productionEnv.APP_PORT || '3010',
        PORT: productionEnv.PORT || productionEnv.APP_PORT || '3010',
      },
      max_memory_restart: '512M',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
