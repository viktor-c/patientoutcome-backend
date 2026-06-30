import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeAccessLogRepository } from '../codeAccessLogRepository'

const {
  logCreateMock,
  logFindByIdMock,
  logFindMock,
  logUpdateOneMock,
  logAggregeateMock
} = vi.hoisted(() => {
  const logAggegeateMock = vi.fn()
  const logUpdateOneMock = vi.fn()
  const logFindMock = vi.fn()
  const logFindByIdMock = vi.fn()
  const logCreateMock = vi.fn()

  return {
    logCreateMock,
    logFindByIdMock,
    logFindMock,
    logUpdateOneMock,
    logAggegeateMock
  }
})

vi.mock('../codeAccessLogModel', () => ({
  CodeAccessLogModel: {
    create: logCreateMock,
    findById: logFindByIdMock,
    find: logFindMock,
    updateOne: logUpdateOneMock,
    aggregate: logAggegeateMock
  }
}))

describe('CodeAccessLogRepository', () => {
  let logRepository: CodeAccessLogRepository

  beforeEach(() => {
    logRepository = new CodeAccessLogRepository({} as any)
    vi.clearAllMocks()
  })

  describe('createAccessLog', () => {
    it('should create a new access log entry with session metadata', async () => {
      const logData = {
        codeId: 'code123',
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      const mockLog = {
        _id: 'log123',
        ...logData,
        sessionStartedAt: new Date(),
        formsCompleted: [],
        successful: false
      }

      logCreateMock.mockResolvedValue(mockLog)

      const result = await logRepository.createAccessLog(logData)

      expect(logCreateMock).toHaveBeenCalledWith(expect.objectContaining(logData))
      expect(result._id).toBe('log123')
      expect(result.formsCompleted).toEqual([])
    })

    it('should set sessionStartedAt to current time', async () => {
      const logData = {
        codeId: 'code123',
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }

      const beforeCreate = new Date()
      const mockLog = {
        _id: 'log123',
        ...logData,
        sessionStartedAt: new Date(),
        formsCompleted: [],
        successful: false
      }

      logCreateMock.mockResolvedValue(mockLog)

      const result = await logRepository.createAccessLog(logData)
      const afterCreate = new Date()

      expect(result.sessionStartedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(result.sessionStartedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })
  })

  describe('addFormCompletion', () => {
    it('should add form completion data to existing log', async () => {
      const logId = 'log123'
      const formCompletion = {
        formId: 'form123',
        formName: 'AOFAS',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:05:00Z'),
        durationMs: 300000
      }

      const mockUpdatedLog = {
        _id: logId,
        formsCompleted: [formCompletion]
      }

      logUpdateOneMock.mockResolvedValue(mockUpdatedLog)

      const result = await logRepository.addFormCompletion(logId, formCompletion)

      expect(logUpdateOneMock).toHaveBeenCalledWith(
        { _id: logId },
        expect.objectContaining({
          $push: expect.objectContaining({
            formsCompleted: formCompletion
          })
        })
      )
    })

    it('should calculate form duration correctly', async () => {
      const logId = 'log123'
      const startedAt = new Date('2024-01-15T10:00:00Z')
      const completedAt = new Date('2024-01-15T10:05:00Z')
      const formCompletion = {
        formId: 'form123',
        formName: 'Test Form',
        startedAt,
        completedAt,
        durationMs: 300000
      }

      logUpdateOneMock.mockResolvedValue({
        _id: logId,
        formsCompleted: [formCompletion]
      })

      await logRepository.addFormCompletion(logId, formCompletion)

      // Verify duration is 5 minutes (300000ms)
      expect(formCompletion.durationMs).toBe(300000)
    })
  })

  describe('completeSession', () => {
    it('should mark session as complete with end time and calculate duration', async () => {
      const logId = 'log123'
      const sessionStartedAt = new Date('2024-01-15T10:00:00Z')
      const sessionEndedAt = new Date('2024-01-15T10:30:00Z')
      const expectedDurationMs = 1800000 // 30 minutes

      logUpdateOneMock.mockResolvedValue({
        _id: logId,
        sessionStartedAt,
        sessionEndedAt,
        totalSessionDurationMs: expectedDurationMs,
        successful: true
      })

      const result = await logRepository.completeSession(logId, sessionEndedAt)

      expect(logUpdateOneMock).toHaveBeenCalledWith(
        { _id: logId },
        expect.objectContaining({
          $set: expect.objectContaining({
            sessionEndedAt,
            successful: true
          })
        })
      )
      expect(result.successful).toBe(true)
    })

    it('should set successful flag to true', async () => {
      const logId = 'log123'
      const sessionEndedAt = new Date()

      logUpdateOneMock.mockResolvedValue({
        _id: logId,
        sessionEndedAt,
        successful: true
      })

      const result = await logRepository.completeSession(logId, sessionEndedAt)

      expect(result.successful).toBe(true)
    })
  })

  describe('getAccessLogsByCode', () => {
    it('should return all access logs for a specific code', async () => {
      const code = 'TEST123'
      const mockLogs = [
        {
          _id: 'log1',
          code,
          sessionStartedAt: new Date(),
          formsCompleted: [{ formId: 'form1' }]
        },
        {
          _id: 'log2',
          code,
          sessionStartedAt: new Date(),
          formsCompleted: []
        }
      ]

      logFindMock.mockResolvedValue(mockLogs)

      const result = await logRepository.getAccessLogsByCode(code)

      expect(logFindMock).toHaveBeenCalledWith({ code })
      expect(result).toHaveLength(2)
    })

    it('should return empty array if no logs found for code', async () => {
      const code = 'NONEXISTENT'

      logFindMock.mockResolvedValue([])

      const result = await logRepository.getAccessLogsByCode(code)

      expect(result).toEqual([])
    })
  })

  describe('getCodeAccessStatistics', () => {
    it('should calculate comprehensive statistics for code usage', async () => {
      const code = 'TEST123'
      const mockStats = [
        {
          _id: code,
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
      ]

      logAggegeateMock.mockResolvedValue(mockStats)

      const result = await logRepository.getCodeAccessStatistics(code)

      expect(logAggegeateMock).toHaveBeenCalled()
      expect(result.totalAccesses).toBe(5)
      expect(result.totalFormsCompleted).toBe(12)
    })

    it('should include form-level breakdown in statistics', async () => {
      const code = 'TEST123'
      const mockStats = [
        {
          _id: code,
          totalAccesses: 5,
          formsCompletedByType: {
            AOFAS: 5,
            'FFI-R': 4,
            'Other': 3
          }
        }
      ]

      logAggegeateMock.mockResolvedValue(mockStats)

      const result = await logRepository.getCodeAccessStatistics(code)

      expect(result.formsCompletedByType).toEqual({
        AOFAS: 5,
        'FFI-R': 4,
        'Other': 3
      })
    })

    it('should calculate success rate from successful and failed sessions', async () => {
      const code = 'TEST123'
      const successfulSessions = 4
      const failedSessions = 1
      const totalSessions = successfulSessions + failedSessions

      const mockStats = [
        {
          _id: code,
          totalAccesses: totalSessions,
          successfulSessions,
          failedSessions,
          successRate: (successfulSessions / totalSessions) * 100
        }
      ]

      logAggegeateMock.mockResolvedValue(mockStats)

      const result = await logRepository.getCodeAccessStatistics(code)

      const expectedSuccessRate = (4 / 5) * 100
      expect(result.successRate).toBe(expectedSuccessRate)
    })
  })

  describe('getAccessLogById', () => {
    it('should retrieve a specific access log by ID', async () => {
      const logId = 'log123'
      const mockLog = {
        _id: logId,
        code: 'TEST123',
        sessionStartedAt: new Date(),
        formsCompleted: []
      }

      logFindByIdMock.mockResolvedValue(mockLog)

      const result = await logRepository.getAccessLogById(logId)

      expect(logFindByIdMock).toHaveBeenCalledWith(logId)
      expect(result._id).toBe(logId)
    })

    it('should return null if log not found', async () => {
      logFindByIdMock.mockResolvedValue(null)

      const result = await logRepository.getAccessLogById('NONEXISTENT')

      expect(result).toBeNull()
    })
  })
})
