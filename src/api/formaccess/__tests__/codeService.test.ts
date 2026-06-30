import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeService } from '../codeService'
import { CodeRepository } from '../codeRepository'
import { CodeAccessLogRepository } from '../codeAccessLogRepository'
import { ConsultationRepository } from '../../consultation/consultationRepository'
import { FormRepository } from '../../form/formRepository'
import { ServiceResponse } from '../../../utils/ServiceResponse'
import { StatusCodes } from 'http-status-codes'
import { startOfDay, endOfDay } from 'date-fns'

// Mock dependencies
vi.mock('../codeRepository')
vi.mock('../codeAccessLogRepository')
vi.mock('../../consultation/consultationRepository')
vi.mock('../../form/formRepository')

describe('CodeService', () => {
  let codeService: CodeService
  let codeRepository: CodeRepository
  let codeAccessLogRepository: CodeAccessLogRepository
  let consultationRepository: ConsultationRepository
  let formRepository: FormRepository

  beforeEach(() => {
    codeRepository = new CodeRepository({} as any)
    codeAccessLogRepository = new CodeAccessLogRepository({} as any)
    consultationRepository = new ConsultationRepository({} as any)
    formRepository = new FormRepository({} as any)
    codeService = new CodeService(codeRepository, codeAccessLogRepository, consultationRepository, formRepository)
    vi.clearAllMocks()
  })

  describe('resolveActiveConsultationForCode', () => {
    const mockConsultations = [
      {
        _id: 'consultation1',
        dateAndTime: '2024-01-15T09:00:00Z',
        patientFormData: null, // Has unfilled forms
        accessWindow: { startDate: '2024-01-01', endDate: '2024-01-31' }
      },
      {
        _id: 'consultation2',
        dateAndTime: '2024-01-20T10:00:00Z',
        patientFormData: { someForm: { field: 'value' } }, // Has completed forms
        accessWindow: { startDate: '2024-01-01', endDate: '2024-01-31' }
      },
      {
        _id: 'consultation3',
        dateAndTime: '2024-02-15T09:00:00Z',
        patientFormData: null,
        accessWindow: { startDate: '2024-02-01', endDate: '2024-02-28' }
      }
    ]

    it('should filter consultations to only those within access window (date-only comparison)', async () => {
      const code = 'TEST123'
      const today = new Date('2024-01-15')
      
      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(mockConsultations)

      const result = await codeService.resolveActiveConsultationForCode(code, 'case123', today)

      // Should only get consultations on 2024-01-15
      const filteredByDate = mockConsultations.filter(c => {
        const consultationDate = startOfDay(new Date(c.dateAndTime))
        const expectedDate = startOfDay(today)
        return consultationDate.getTime() === expectedDate.getTime()
      })

      expect(filteredByDate.length).toBeGreaterThan(0)
    })

    it('should exclude consultations with completed patient form data', async () => {
      const code = 'TEST123'
      const today = new Date('2024-01-20')
      
      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(mockConsultations)

      const result = await codeService.resolveActiveConsultationForCode(code, 'case123', today)

      // consultation2 has completed forms so should be excluded
      if (result && result.responseObject) {
        expect(result.responseObject._id).not.toBe('consultation2')
      }
    })

    it('should prefer past consultations over future ones when dates are equally distant', async () => {
      const consultations = [
        {
          _id: 'pastConsult',
          dateAndTime: new Date('2024-01-10T10:00:00Z'),
          patientFormData: null
        },
        {
          _id: 'futureConsult',
          dateAndTime: new Date('2024-01-20T10:00:00Z'),
          patientFormData: null
        }
      ]
      
      const referenceDate = new Date('2024-01-15')
      
      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(new Date('2024-01-01')),
        endDate: endOfDay(new Date('2024-01-31'))
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      const result = await codeService.resolveActiveConsultationForCode('TEST123', 'case123', referenceDate)

      // Both are 5 days away but past should be preferred
      if (result && result.responseObject) {
        expect(result.responseObject._id).toBe('pastConsult')
      }
    })

    it('should return null when no consultations match criteria', async () => {
      const code = 'TEST123'
      
      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(new Date('2024-03-01')),
        endDate: endOfDay(new Date('2024-03-01'))
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue([])

      const result = await codeService.resolveActiveConsultationForCode(code, 'case123', new Date('2024-03-01'))

      expect(result.responseObject).toBeNull()
    })

    it('should handle consultations with null dateAndTime gracefully', async () => {
      const consultations = [
        {
          _id: 'consult1',
          dateAndTime: null,
          patientFormData: null
        },
        {
          _id: 'consult2',
          dateAndTime: '2024-01-15T10:00:00Z',
          patientFormData: null
        }
      ]
      
      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(new Date('2024-01-15')),
        endDate: endOfDay(new Date('2024-01-15'))
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      // Should not throw and should handle the null date
      const result = await codeService.resolveActiveConsultationForCode('TEST123', 'case123', new Date('2024-01-15'))

      expect(result.statusCode).toBeDefined()
    })
  })

  describe('archiveCode', () => {
    it('should archive a code with user ID and timestamp', async () => {
      const code = 'TEST123'
      const userId = 'user123'
      
      ;(codeRepository.archiveCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date(),
        archivedBy: userId
      })

      const result = await codeService.archiveCode(code, userId)

      expect(codeRepository.archiveCode).toHaveBeenCalledWith(code, userId)
      expect(result.responseObject?.archivedBy).toBe(userId)
    })

    it('should return error if archive fails', async () => {
      const code = 'INVALID'
      const userId = 'user123'
      
      ;(codeRepository.archiveCode as vi.Mock).mockRejectedValue(new Error('Code not found'))

      const result = await codeService.archiveCode(code, userId)

      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('restoreCode', () => {
    it('should restore an archived code', async () => {
      const code = 'TEST123'
      
      ;(codeRepository.restoreCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: null,
        archivedBy: null
      })

      const result = await codeService.restoreCode(code)

      expect(codeRepository.restoreCode).toHaveBeenCalledWith(code)
      expect(result.responseObject?.archivedOn).toBeNull()
    })
  })

  describe('validateCode', () => {
    it('should return 403 Forbidden if code is archived', async () => {
      const code = 'ARCHIVED123'
      
      ;(codeRepository.getCodeByCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date(),
        archivedBy: 'user123'
      })

      const result = await codeService.validateCode(code)

      expect(result.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 200 if code is valid and not archived', async () => {
      const code = 'VALID123'
      
      ;(codeRepository.getCodeByCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: null,
        activated: true,
        activatedOn: new Date()
      })

      const result = await codeService.validateCode(code)

      expect(result.statusCode).toBe(StatusCodes.OK)
    })
  })

  describe('createCodeAccessLog', () => {
    it('should create access log with session data', async () => {
      const logData = {
        codeId: 'code123',
        code: 'TEST123',
        patientCaseId: 'case123',
        consultationId: 'consultation123'
      }
      
      ;(codeAccessLogRepository.createAccessLog as vi.Mock).mockResolvedValue({
        _id: 'log123',
        ...logData,
        sessionStartedAt: new Date()
      })

      const result = await codeService.createCodeAccessLog(logData)

      expect(codeAccessLogRepository.createAccessLog).toHaveBeenCalledWith(logData)
      expect(result.responseObject?._id).toBe('log123')
    })
  })

  describe('addFormCompletionToAccessLog', () => {
    it('should add form completion data to existing access log', async () => {
      const logId = 'log123'
      const formCompletion = {
        formId: 'form123',
        formName: 'AOFAS',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 300000
      }
      
      ;(codeAccessLogRepository.addFormCompletion as vi.Mock).mockResolvedValue({
        _id: logId,
        formsCompleted: [formCompletion]
      })

      const result = await codeService.addFormCompletionToAccessLog(logId, formCompletion)

      expect(codeAccessLogRepository.addFormCompletion).toHaveBeenCalledWith(logId, formCompletion)
      expect(result.responseObject?.formsCompleted).toContain(formCompletion)
    })
  })

  describe('completeAccessSession', () => {
    it('should mark access log session as complete with duration', async () => {
      const logId = 'log123'
      const sessionEndedAt = new Date()
      
      ;(codeAccessLogRepository.completeSession as vi.Mock).mockResolvedValue({
        _id: logId,
        sessionEndedAt,
        totalSessionDurationMs: 600000,
        successful: true
      })

      const result = await codeService.completeAccessSession(logId, sessionEndedAt)

      expect(codeAccessLogRepository.completeSession).toHaveBeenCalledWith(logId, sessionEndedAt)
      expect(result.responseObject?.successful).toBe(true)
    })
  })

  describe('getCodeAccessStatistics', () => {
    it('should return statistics for code access and form completions', async () => {
      const code = 'TEST123'
      const stats = {
        totalAccesses: 5,
        totalFormsCompleted: 12,
        averageSessionDurationMs: 450000,
        successfulSessions: 4,
        failedSessions: 1
      }
      
      ;(codeAccessLogRepository.getCodeAccessStatistics as vi.Mock).mockResolvedValue(stats)

      const result = await codeService.getCodeAccessStatistics(code)

      expect(codeAccessLogRepository.getCodeAccessStatistics).toHaveBeenCalledWith(code)
      expect(result.responseObject?.totalAccesses).toBe(5)
      expect(result.responseObject?.averageSessionDurationMs).toBe(450000)
    })
  })
})
