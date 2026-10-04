import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const exec = promisify(execFile)

it('builds standalone host and loader client using host-provided dependencies', async t => {
  const standalone = await mkdtemp(join(tmpdir(), 'pstack-build-'))
  t.after(() => rm(standalone, { recursive: true, force: true }))
  for (const path of ['package.json', 'tsdown.config.ts', 'tsconfig.json', 'tsconfig.client.json', 'src', 'scripts']) {
    await cp(join(root, path), join(standalone, path), { recursive: true })
  }
  await symlink(join(root, 'node_modules'), join(standalone, 'node_modules'), 'junction')
  const env = { ...process.env }
  delete env.DSH_ROOT
  delete env.DSHX_HARNESS
  await exec('npm', ['run', 'build'], { cwd: standalone, env, timeout: 60_000 })

  assert.deepEqual((await readdir(join(standalone, 'lib'))).sort(), ['client.js', 'index.d.ts', 'index.js'])
  await exec(process.execPath, ['--check', 'lib/index.js'], { cwd: standalone })

  const client = await readFile(join(standalone, 'lib/client.js'), 'utf8')
  const loaded: string[] = []
  const dependencies: string[] = []
  const sections: string[] = []
  runInNewContext(client, {
    window: {
      __ModuleLoader__: {
        load({ id, factory }: { id: string; factory: (require: (id: string) => unknown) => unknown }) {
          loaded.push(id)
          const plugin = factory(id => {
            dependencies.push(id)
            return {}
          })
          assert(typeof plugin === 'object' && plugin !== null && 'apply' in plugin && 'inject' in plugin)
          assert(typeof plugin.apply === 'function')
          assert(Array.isArray(plugin.inject))
          assert.deepEqual(Array.from(plugin.inject), ['slots', 'locale', 'remote'])
          plugin.apply({
            effect: (effect: () => void) => effect(),
            locale: { register: () => {}, bind: () => () => 'pstack roles' },
            slots: {
              inject: (slot: string, install: () => void) => {
                assert.equal(slot, 'settings.section')
                install()
              },
              register: (section: { id: string; label: () => string }, component: unknown) => {
                sections.push(section.id)
                assert.equal(section.label(), 'pstack roles')
                assert.equal(typeof component, 'function')
              },
            },
          })
        },
      },
    },
  }, { timeout: 1_000 })
  assert.deepEqual(loaded, ['pstack-dsh'])
  assert.deepEqual(sections, ['pstack'])
  assert.deepEqual(dependencies.sort(), ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'])

  await exec(process.execPath, ['scripts/wrap-client.mjs'], { cwd: standalone })
  assert.equal(await readFile(join(standalone, 'lib/client.js'), 'utf8'), client)
})
