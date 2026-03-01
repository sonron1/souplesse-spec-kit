import prisma from '../utils/prisma'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Program } from '@prisma/client'
import type { CreateProgramInput, UpdateProgramInput } from '../validators/program.schemas'

export const programService = {
  /**
   * Create a personalized program for a client.
   * Only coaches (and admins) may create programs.
   */
  async createProgram(coachId: string, input: CreateProgramInput): Promise<Program> {
    const program = await prisma.program.create({
      data: {
        coachId,
        clientId: input.clientId,
        type: input.type,
        content: input.content,
      },
    })
    logger.info({ programId: program.id, coachId, clientId: input.clientId }, 'Program created')
    return program
  },

  /**
   * Update a program — only the coach who created it may edit.
   */
  async updateProgram(programId: string, coachId: string, input: UpdateProgramInput): Promise<Program> {
    const program = await prisma.program.findUnique({ where: { id: programId } })
    if (!program) {
      throw createError({ statusCode: 404, statusMessage: 'Program not found' })
    }
    if (program.coachId !== coachId) {
      throw createError({ statusCode: 403, statusMessage: 'Only the assigned coach may edit this program' })
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.content !== undefined && { content: input.content }),
      },
    })
    logger.info({ programId, coachId }, 'Program updated')
    return updated
  },

  /**
   * Get all programs for a client.
   * Clients see their own programs; coaches see programs they manage.
   */
  async getProgramsByClient(clientId: string): Promise<Program[]> {
    return prisma.program.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })
  },

  /**
   * Get a single program — validates the requesting user has access.
   */
  async getProgramById(programId: string, requesterId: string, requesterRole: string): Promise<Program> {
    const program = await prisma.program.findUnique({ where: { id: programId } })
    if (!program) {
      throw createError({ statusCode: 404, statusMessage: 'Program not found' })
    }

    const isOwner = program.clientId === requesterId || program.coachId === requesterId
    const isAdmin = requesterRole === 'ADMIN'
    if (!isOwner && !isAdmin) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    return program
  },
}
