import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createSkillProvider } from '../src/skills-provider.ts'

const root = fileURLToPath(new URL('../skills', import.meta.url))

describe('upstream 0.15 DSH skill availability', () => {
  it('discovers both new principles and loads their content through the provider', async () => {
    const provider = createSkillProvider(root)
    const skills = await provider.list()
    for (const name of ['principle-attack-the-premise', 'principle-test-behavior-not-implementation']) {
      const listed = skills.find(skill => skill.name === name)
      assert.equal(listed?.invocation.modelInvocable, true, name)
      const loaded = await provider.get({ name })
      assert.equal(loaded?.name, name)
      assert.equal(loaded?.invocation.modelInvocable, true)
      assert.ok(loaded?.content.includes(name === 'principle-attack-the-premise'
        ? 'Attack the Premise' : 'Test Behavior'))
    }
  })

  it('exposes internal workflow dependencies while preserving explicit user entry points', async () => {
    const provider = createSkillProvider(root)
    const listed = await provider.list()
    const internal = [
      'architect', 'arena', 'figure-it-out', 'interrogate',
      'no-comments', 'show-me-your-work', 'swarm', 'technical-writing',
    ]
    const userOnly = [
      'automate-me', 'blast-radius', 'bro', 'create-verification-skill',
      'maintain-verification-skill', 'poteto-mode', 'recall', 'reflect', 'tdd', 'teach',
    ]
    assert.deepEqual(listed.filter(skill => !skill.invocation.modelInvocable).map(skill => skill.name).sort(), userOnly)
    for (const name of [...internal, ...userOnly]) {
      const expected = { modelInvocable: internal.includes(name), userInvocable: true }
      assert.deepEqual(listed.find(skill => skill.name === name)?.invocation, expected, name)
      const loaded = await provider.get({ name })
      assert.deepEqual(loaded?.invocation, expected, name)
      assert.equal(loaded?.provider, 'pstack-dsh', name)
      assert.ok(loaded?.content.trim(), name)
    }
  })

  it('keeps all principle and common workflow skills available to the model', async () => {
    const provider = createSkillProvider(root)
    const names = (await readdir(root)).filter(name => name.startsWith('principle-'))
    assert.equal(names.length, 23)
    for (const name of [...names, 'how', 'why', 'unslop', 'typescript-best-practices']) {
      const skill = await provider.get({ name })
      assert.equal(skill?.invocation.modelInvocable, true, name)
    }
    assert.equal(await provider.get({ name: 'make-bot-ui' }), undefined)
  })
})
