import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8')
}

/**
 * The admin barrel was trimmed when the court-reservation system was removed
 * along with its hidden admin pages (locations / courts / reservations /
 * pricing / events / stripe). This test only asserts what's currently shipping.
 */
describe('Admin barrel re-exports', () => {
  const barrelContent = read('app/actions/admin.ts')

  const expectedFunctions = [
    'requireAdmin',
    'getAdminStatsAction',
    'searchUsersAction',
    'getUserDetailsAction',
    'disableUserAction',
    'enableUserAction',
    'triggerPasswordResetAction',
    'updateUserCountryAction',
    'toggleLocalStatusAction',
    'getContentBlocksAction',
    'updateContentBlockAction',
    'reorderContentBlocksAction',
    'getGalleryItemsAction',
    'createGalleryItemAction',
    'updateGalleryItemAction',
    'deleteGalleryItemAction',
    'uploadGalleryFileAction',
    'getExpeditionsAction',
    'createExpeditionAction',
    'updateExpeditionAction',
    'deleteExpeditionAction',
    'uploadExpeditionImageAction',
  ]

  it('barrel file re-exports every action it claims to', () => {
    for (const fn of expectedFunctions) {
      expect(barrelContent, `Missing re-export for ${fn}`).toContain(fn)
    }
  })
})

describe('Admin domain files', () => {
  const domainFiles = [
    'app/actions/admin/auth.ts',
    'app/actions/admin/stats.ts',
    'app/actions/admin/users.ts',
    'app/actions/admin/cms.ts',
    'app/actions/admin/gallery.ts',
    'app/actions/admin/expeditions.ts',
  ]

  for (const file of domainFiles) {
    it(`${file} has 'use server' directive`, () => {
      const content = read(file)
      expect(content.startsWith("'use server'"), `${file} missing 'use server'`).toBe(true)
    })
  }

  // Every domain file except auth.ts should import requireAdmin and use it.
  const filesRequiringAuth = domainFiles.filter((f) => !f.endsWith('auth.ts'))

  for (const file of filesRequiringAuth) {
    it(`${file} imports requireAdmin from ./auth`, () => {
      const content = read(file)
      expect(content, `${file} missing requireAdmin import`).toContain("from './auth'")
    })
    it(`${file} actually calls await requireAdmin() somewhere`, () => {
      const content = read(file)
      expect(content, `${file} declares but does not call requireAdmin`).toMatch(/await\s+requireAdmin\s*\(/)
    })
  }
})
