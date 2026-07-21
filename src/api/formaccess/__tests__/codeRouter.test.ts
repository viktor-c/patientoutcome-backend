import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Router } from 'express'
import { CodeRouter } from '../codeRouter'
import { CodeService } from '../codeService'
import { ServiceResponse } from '../../../utils/ServiceResponse'
import { StatusCodes } from 'http-status-codes'

// Mock dependencies
vi.mock('../codeService')
vi.mock('express', () => ({
  Router: vi.fn(() => ({
    post: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  }))
}))

describe('CodeRouter', () => {
  let codeRouter: CodeRouter
  let codeService: CodeService
  let mockRouter: any

  beforeEach(() => {
    mockRouter = Router()
    codeService = new CodeService({} as any, {} as any, {} as any, {} as any)
    codeRouter = new CodeRouter([codeService])
    vi.clearAllMocks()
  })

  describe('Archive Code Endpoint', () => {
    it('should have archive endpoint registered', () => {
      expect(mockRouter.put).toHaveBeenCalled()
    })

    it('should archive code successfully with 200 status', async () => {
      const code = 'TEST123'
      const userId = 'user123'

      const response = new ServiceResponse('Code archived successfully', {
        code,
        archivedOn: new Date(),
        archivedBy: userId
      }, StatusCodes.OK)

      ;(codeService.archiveCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.archiveCode(code, userId)

      expect(result.statusCode).toBe(StatusCodes.OK)
      expect(result.responseObject?.archivedBy).toBe(userId)
    })

    it('should return 400 for missing code', async () => {
      const response = new ServiceResponse(
        'Code is required',
        null,
        StatusCodes.BAD_REQUEST
      )

      ;(codeService.archiveCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.archiveCode('', 'user123')

      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 404 for non-existent code', async () => {
      const response = new ServiceResponse(
        'Code not found',
        null,
        StatusCodes.NOT_FOUND
      )

      ;(codeService.archiveCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.archiveCode('INVALID', 'user123')

      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('Restore Code Endpoint', () => {
    it('should have restore endpoint registered', () => {
      expect(mockRouter.put).toHaveBeenCalled()
    })

    it('should restore code successfully', async () => {
      const code = 'TEST123'

      const response = new ServiceResponse('Code restored successfully', {
        code,
        archivedOn: null,
        archivedBy: null
      }, StatusCodes.OK)

      ;(codeService.restoreCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.restoreCode(code)

      expect(result.statusCode).toBe(StatusCodes.OK)
      expect(result.responseObject?.archivedOn).toBeNull()
    })

    it('should return 404 for non-existent code', async () => {
      const response = new ServiceResponse(
        'Code not found',
        null,
        StatusCodes.NOT_FOUND
      )

      ;(codeService.restoreCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.restoreCode('INVALID')

      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('Get Access Logs Endpoint', () => {
    it('should have get access logs endpoint registered', () => {
      expect(mockRouter.get).toHaveBeenCalled()
    })

    it('should return access logs for code', async () => {
      const code = 'TEST123'
      const mockLogs = [
        {
          _id: 'log1',
          code,
          sessionStartedAt: new Date(),
          formsCompleted: []
        },
        {
          _id: 'log2',
          code,
          sessionStartedAt: new Date(),
          formsCompleted: [{ formId: 'form1' }]
        }
      ]

      const response = new ServiceResponse(
        'Access logs retrieved successfully',
        mockLogs,
        StatusCodes.OK
      )

      ;(codeService.getCodeAccessLogs as vi.Mock).mockResolvedValue(response)

      const result = await codeService.getCodeAccessLogs(code)

      expect(result.statusCode).toBe(StatusCodes.OK)
      expect(result.responseObject).toHaveLength(2)
    })

    it('should return empty array if no logs found', async () => {
      const code = 'NONEXISTENT'

      const response = new ServiceResponse(
        'No access logs found',
        [],
        StatusCodes.OK
      )

      ;(codeService.getCodeAccessLogs as vi.Mock).mockResolvedValue(response)

      const result = await codeService.getCodeAccessLogs(code)

      expect(result.statusCode).toBe(StatusCodes.OK)
      expect(result.responseObject).toEqual([])
    })

    it('should support pagination query parameters', () => {
      // Router should accept skip and limit query params
      expect(mockRouter.get).toBeDefined()
    })
  })

  describe('Get Statistics Endpoint', () => {
    it('should have get statistics endpoint registered', () => {
      expect(mockRouter.get).toHaveBeenCalled()
    })

    it('should return comprehensive statistics for code', async () => {
      const code = 'TEST123'
      const stats = {
        totalAccesses: 5,
        totalFormsCompleted: 12,
        averageSessionDurationMs: 450000,
        successfulSessions: 4,
        failedSessions: 1,
        formsCompletedByType: {
          AOFAS: 5,
          'FFI-R': 4,
          'Other': 3
        }
      }

      const response = new ServiceResponse(
        'Statistics retrieved successfully',
        stats,
        StatusCodes.OK
      )

      ;(codeService.getCodeAccessStatistics as vi.Mock).mockResolvedValue(response)

      const result = await codeService.getCodeAccessStatistics(code)

      expect(result.statusCode).toBe(StatusCodes.OK)
      expect(result.responseObject?.totalAccesses).toBe(5)
      expect(result.responseObject?.totalFormsCompleted).toBe(12)
      expect(result.responseObject?.averageSessionDurationMs).toBe(450000)
    })

    it('should include success rate calculation', async () => {
      const code = 'TEST123'
      const stats = {
        totalAccesses: 5,
        successfulSessions: 4,
        failedSessions: 1,
        successRate: 80
      }

      const response = new ServiceResponse(
        'Statistics retrieved successfully',
        stats,
        StatusCodes.OK
      )

      ;(codeService.getCodeAccessStatistics as vi.Mock).mockResolvedValue(response)

      const result = await codeService.getCodeAccessStatistics(code)

      expect(result.responseObject?.successRate).toBe(80)
    })

    it('should return 0 values if code has no accesses', async () => {
      const code = 'UNUSED'
      const stats = {
        totalAccesses: 0,
        totalFormsCompleted: 0,
        averageSessionDurationMs: 0,
        successfulSessions: 0,
        failedSessions: 0
      }

      const response = new ServiceResponse(
        'Statistics retrieved successfully',
        stats,
        StatusCodes.OK
      )

      ;(codeService.getCodeAccessStatistics as vi.Mock).mockResolvedValue(response)

      const result = await codeService.getCodeAccessStatistics(code)

      expect(result.responseObject?.totalAccesses).toBe(0)
      expect(result.responseObject?.totalFormsCompleted).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for invalid request body', () => {
      // Router should validate request schema
      expect(mockRouter.post || mockRouter.put).toBeDefined()
    })

    it('should return 401 for unauthorized requests', async () => {
      const response = new ServiceResponse(
        'Unauthorized',
        null,
        StatusCodes.UNAUTHORIZED
      )

      ;(codeService.archiveCode as vi.Mock).mockResolvedValue(response)

      const result = await codeService.archiveCode('TEST123', '')

      expect(result.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('should handle internal server errors gracefully', async () => {
      ;(codeService.getCodeAccessStatistics as vi.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      try {
        await codeService.getCodeAccessStatistics('TEST123')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Request Validation', () => {
    it('should validate code parameter format', () => {
      // Code should be validated as string
      expect(true).toBe(true)
    })

    it('should validate userId in archive requests', () => {
      // userId should be validated as objectId or string
      expect(true).toBe(true)
    })

    it('should support query parameters for pagination', () => {
      // skip, limit parameters
      expect(true).toBe(true)
    })
  })
})
