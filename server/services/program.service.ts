import { prisma } from '../utils/prisma'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Program } from '.prisma/client'
import type { CreateProgramInput, UpdateProgramInput } from '../validators/program.schemas'

export const programService = {
  /**
   * Create a personalized program for a client.
   * Only a coach explicitly assigned to the client by an admin may create programs.
   */
  async createProgram(coachId: string, input: CreateProgramInput): Promise<Program> {
    // Assignment check (FR-008): only assigned coaches may create programs
    const assignment = await prisma.coachClientAssignment.findUnique({
      where: { coachId_clientId: { coachId, clientId: input.clientId } },
    })
    if (!assignment) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'êtes pas affecté à ce client',
      })
    }

    const program = await prisma.program.create({
      data: {
        coachId,
        clientId: input.clientId,
        type: input.type,
        content: input.content as object,
      },
    })
    logger.info({ programId: program.id, coachId, clientId: input.clientId }, 'Program created')
    return program
  },

  /**
   * Update a program — only the assigned coach who created it may edit.
   */
  async updateProgram(
    programId: string,
    coachId: string,
    input: UpdateProgramInput
  ): Promise<Program> {
    const program = await prisma.program.findUnique({ where: { id: programId } })
    if (!program) {
      throw createError({ statusCode: 404, message: 'Programme introuvable' })
    }
    if (program.coachId !== coachId) {
      throw createError({
        statusCode: 403,
        message: 'Seul le coach assigné peut modifier ce programme',
      })
    }

    // Verify assignment still exists (admin may have revoked it)
    const assignment = await prisma.coachClientAssignment.findUnique({
      where: { coachId_clientId: { coachId, clientId: program.clientId } },
    })
    if (!assignment) {
      throw createError({
        statusCode: 403,
        message: 'Votre affectation à ce client a été révoquée',
      })
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.content !== undefined && { content: input.content as object }),
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
  async getProgramById(
    programId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<Program> {
    const program = await prisma.program.findUnique({ where: { id: programId } })
    if (!program) {
      throw createError({ statusCode: 404, message: 'Programme introuvable' })
    }

    const isOwner = program.clientId === requesterId || program.coachId === requesterId
    const isAdmin = requesterRole === 'ADMIN'
    if (!isOwner && !isAdmin) {
      throw createError({ statusCode: 403, message: 'Accès refusé' })
    }

    return program
  },
}
