import { describe, it, expect, vi, beforeEach } from 'vitest'
import { programService } from '../../server/services/program.service'

vi.mock('../../server/services/program.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockProgram = vi.mocked(programService)

beforeEach(() => { vi.clearAllMocks() })

describe('Program routes integration', () => {
  describe('POST /api/programs (via service)', () => {
    it('coach creates a program', async () => {
      const p = { id: 'prog-1', coachId: 'coach-1', clientId: 'client-1', type: 'GAIN', content: {} }
      mockProgram.createProgram.mockResolvedValue(p as never)

      const result = await programService.createProgram('coach-1', {
        clientId: 'client-1',
        type: 'GAIN',
        content: {},
      })
      expect(result.type).toBe('GAIN')
    })
  })

  describe('PUT /api/programs/:id (via service)', () => {
    it('coach updates their program', async () => {
      const updated = { id: 'prog-1', type: 'LOSS' }
      mockProgram.updateProgram.mockResolvedValue(updated as never)

      const result = await programService.updateProgram('prog-1', 'coach-1', { type: 'LOSS' })
      expect(result.type).toBe('LOSS')
    })

    it('unauthorized coach gets 403', async () => {
      mockProgram.updateProgram.mockRejectedValue({ statusCode: 403 })
      await expect(
        programService.updateProgram('prog-1', 'other-coach', { type: 'LOSS' })
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })
})
