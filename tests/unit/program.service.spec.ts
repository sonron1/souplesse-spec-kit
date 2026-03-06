import { describe, it, expect, vi, beforeEach } from 'vitest'
import { programService } from '../../server/services/program.service'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    program: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    coachClientAssignment: {
      findFirst: vi.fn(),
    },
  },
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'
const mockPrisma = vi.mocked(prisma) as any

const MOCK_PROGRAM = {
  id: 'prog-1',
  coachId: 'coach-1',
  clientId: 'client-1',
  type: 'CARDIO' as const,
  content: { exercises: [] },
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('programService.createProgram', () => {
  it('creates a program assigned to coach and client', async () => {
    mockPrisma.coachClientAssignment.findFirst.mockResolvedValue({
      coachId: 'coach-1',
      clientId: 'client-1',
    } as never)
    mockPrisma.program.create.mockResolvedValue(MOCK_PROGRAM)

    const result = await programService.createProgram('coach-1', {
      clientId: 'client-1',
      type: 'CARDIO',
      content: { exercises: [] },
    })
    expect(result.coachId).toBe('coach-1')
    expect(result.clientId).toBe('client-1')
  })
})

describe('programService.updateProgram', () => {
  it('allows the assigned coach to update their program', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(MOCK_PROGRAM)
    mockPrisma.coachClientAssignment.findFirst.mockResolvedValue({
      coachId: 'coach-1',
      clientId: 'client-1',
    } as never)
    const updated = { ...MOCK_PROGRAM, type: 'LOWER_BODY' as const }
    mockPrisma.program.update.mockResolvedValue(updated)

    const result = await programService.updateProgram('prog-1', 'coach-1', { type: 'LOWER_BODY' })
    expect(result.type).toBe('LOWER_BODY')
  })

  it('throws 403 if a different coach tries to update', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(MOCK_PROGRAM)

    await expect(
      programService.updateProgram('prog-1', 'other-coach', { type: 'LOWER_BODY' })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 if program does not exist', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(null)

    await expect(programService.updateProgram('bad-prog', 'coach-1', {})).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('programService.getProgramsByClient', () => {
  it('returns programs for the given client', async () => {
    mockPrisma.program.findMany.mockResolvedValue([MOCK_PROGRAM])

    const programs = await programService.getProgramsByClient('client-1')
    expect(programs).toHaveLength(1)
    expect(programs[0].clientId).toBe('client-1')
  })
})

describe('programService.getProgramById', () => {
  it('allows the client to view their own program', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(MOCK_PROGRAM)
    const result = await programService.getProgramById('prog-1', 'client-1', 'CLIENT')
    expect(result.id).toBe('prog-1')
  })

  it('allows the coach to view the program', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(MOCK_PROGRAM)
    const result = await programService.getProgramById('prog-1', 'coach-1', 'COACH')
    expect(result.id).toBe('prog-1')
  })

  it('throws 403 for unauthorized access', async () => {
    mockPrisma.program.findUnique.mockResolvedValue(MOCK_PROGRAM)
    await expect(
      programService.getProgramById('prog-1', 'random-user', 'CLIENT')
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
