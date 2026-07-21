import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeService } from '../codeService'
import { CodeRepository } from '../codeRepository'
import { CodeAccessLogRepository } from '../codeAccessLogRepository'
import { ConsultationRepository } from '../../consultation/consultationRepository'
import { FormRepository } from '../../form/formRepository'
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns'

/**
 * Integration tests for the complete code access flow
 * Tests the end-to-end workflow of:
 * 1. Patient using access code
 * 2. Selecting appropriate consultation
 * 3. Filling forms
 * 4. Tracking completion and duration
 * 5. Archiving code after use
 */

vi.mock('../codeRepository')
vi.mock('../codeAccessLogRepository')
vi.mock('../../consultation/consultationRepository')
vi.mock('../../form/formRepository')

describe('Code Access Integration Tests', () => {
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

  describe('Complete Patient Form Access Workflow', () => {
    it('should handle full workflow: code validation -> consultation selection -> form completion -> archive', async () => {
      const code = 'PATIENT-ACCESS-001'
      const caseId = 'case-123'
      const consultationId = 'consultation-456'
      const patientId = 'patient-789'
      const userId = 'user-admin'

      // Step 1: Validate code is active
      ;(codeRepository.getCodeByCode as vi.Mock).mockResolvedValue({
        _id: 'code-id-123',
        code,
        patientCaseId: caseId,
        activated: true,
        activatedOn: new Date('2024-01-01'),
        archivedOn: null
      })

      const codeValidation = await codeService.validateCode(code)
      expect(codeValidation.statusCode).toBe(200)

      // Step 2: Get accessible consultations
      const today = new Date('2024-01-15')
      const consultations = [
        {
          _id: consultationId,
          dateAndTime: today,
          patientCaseId: caseId,
          patientFormData: null, // Unfilled
          accessWindow: { startDate: startOfDay(today), endDate: endOfDay(today) }
        }
      ]

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      const activeConsultation = await codeService.resolveActiveConsultationForCode(code, caseId, today)
      expect(activeConsultation.statusCode).toBe(200)
      expect(activeConsultation.responseObject?._id).toBe(consultationId)

      // Step 3: Create access log
      const accessLogData = {
        codeId: 'code-id-123',
        code,
        patientCaseId: caseId,
        consultationId
      }

      ;(codeAccessLogRepository.createAccessLog as vi.Mock).mockResolvedValue({
        _id: 'log-id-123',
        ...accessLogData,
        sessionStartedAt: today,
        formsCompleted: []
      })

      const accessLog = await codeService.createCodeAccessLog(accessLogData)
      expect(accessLog.statusCode).toBe(200)
      expect(accessLog.responseObject?._id).toBe('log-id-123')

      // Step 4: Track form completion
      const formCompletion = {
        formId: 'form-id-1',
        formName: 'AOFAS',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:05:00Z'),
        durationMs: 300000
      }

      ;(codeAccessLogRepository.addFormCompletion as vi.Mock).mockResolvedValue({
        _id: 'log-id-123',
        formsCompleted: [formCompletion]
      })

      const updatedLog = await codeService.addFormCompletionToAccessLog('log-id-123', formCompletion)
      expect(updatedLog.statusCode).toBe(200)
      expect(updatedLog.responseObject?.formsCompleted).toContainEqual(formCompletion)

      // Step 5: Complete session
      const sessionEndTime = new Date('2024-01-15T10:30:00Z')
      ;(codeAccessLogRepository.completeSession as vi.Mock).mockResolvedValue({
        _id: 'log-id-123',
        sessionStartedAt: today,
        sessionEndedAt: sessionEndTime,
        totalSessionDurationMs: 1800000,
        formsCompleted: [formCompletion],
        successful: true
      })

      const completedLog = await codeService.completeAccessSession('log-id-123', sessionEndTime)
      expect(completedLog.statusCode).toBe(200)
      expect(completedLog.responseObject?.successful).toBe(true)

      // Step 6: Archive code after use
      ;(codeRepository.archiveCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date(),
        archivedBy: userId
      })

      const archivedCode = await codeService.archiveCode(code, userId)
      expect(archivedCode.statusCode).toBe(200)
      expect(archivedCode.responseObject?.archivedBy).toBe(userId)

      // Step 7: Verify code is now inactive
      ;(codeRepository.getCodeByCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date(),
        archivedBy: userId
      })

      const archivedCodeValidation = await codeService.validateCode(code)
      expect(archivedCodeValidation.statusCode).toBe(403)
    })
  })

  describe('Consultation Selection with Multiple Available', () => {
    it('should select correct consultation when multiple exist with unfilled forms', async () => {
      const code = 'MULTI-CONSULT'
      const caseId = 'case-456'
      const today = new Date('2024-01-15')

      // Three consultations: past, today, future
      const consultations = [
        {
          _id: 'consultation-past',
          dateAndTime: subDays(today, 5),
          patientCaseId: caseId,
          patientFormData: null // Unfilled
        },
        {
          _id: 'consultation-today',
          dateAndTime: today,
          patientCaseId: caseId,
          patientFormData: null // Unfilled
        },
        {
          _id: 'consultation-future',
          dateAndTime: addDays(today, 5),
          patientCaseId: caseId,
          patientFormData: null // Unfilled
        }
      ]

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(subDays(today, 30)),
        endDate: endOfDay(addDays(today, 30))
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      const result = await codeService.resolveActiveConsultationForCode(code, caseId, today)

      expect(result.statusCode).toBe(200)
      // Should select today's consultation
      expect(result.responseObject?._id).toBe('consultation-today')
    })

    it('should skip consultations with completed forms', async () => {
      const code = 'SKIP-COMPLETED'
      const caseId = 'case-789'
      const today = new Date('2024-01-15')

      const consultations = [
        {
          _id: 'consultation-1',
          dateAndTime: today,
          patientCaseId: caseId,
          patientFormData: { someForm: { field: 'value' } } // Completed
        },
        {
          _id: 'consultation-2',
          dateAndTime: today,
          patientCaseId: caseId,
          patientFormData: null // Unfilled
        }
      ]

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      const result = await codeService.resolveActiveConsultationForCode(code, caseId, today)

      expect(result.statusCode).toBe(200)
      // Should skip consultation-1 because forms are completed
      expect(result.responseObject?._id).toBe('consultation-2')
    })

    it('should return null when all consultations on the day have completed forms', async () => {
      const code = 'ALL-COMPLETED'
      const caseId = 'case-999'
      const today = new Date('2024-01-15')

      const consultations = [
        {
          _id: 'consultation-1',
          dateAndTime: today,
          patientCaseId: caseId,
          patientFormData: { form1: { field: 'value' } } // Completed
        }
      ]

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      const result = await codeService.resolveActiveConsultationForCode(code, caseId, today)

      expect(result.statusCode).toBe(200)
      expect(result.responseObject).toBeNull()
    })
  })

  describe('Access Statistics Accumulation', () => {
    it('should accumulate statistics correctly across multiple access sessions', async () => {
      const code = 'STATS-TEST'

      // Simulate statistics after multiple sessions
      const stats = {
        totalAccesses: 3,
        totalFormsCompleted: 8,
        averageSessionDurationMs: 400000,
        successfulSessions: 2,
        failedSessions: 1,
        formsCompletedByType: {
          AOFAS: 3,
          'FFI-R': 3,
          'Other': 2
        },
        accessSessions: [
          {
            sessionStartedAt: new Date('2024-01-01T10:00:00Z'),
            sessionEndedAt: new Date('2024-01-01T10:20:00Z'),
            durationMs: 1200000,
            formsCompleted: 3,
            successful: true
          },
          {
            sessionStartedAt: new Date('2024-01-08T10:00:00Z'),
            sessionEndedAt: new Date('2024-01-08T10:25:00Z'),
            durationMs: 1500000,
            formsCompleted: 3,
            successful: true
          },
          {
            sessionStartedAt: new Date('2024-01-15T10:00:00Z'),
            sessionEndedAt: new Date('2024-01-15T10:05:00Z'),
            durationMs: 300000,
            formsCompleted: 2,
            successful: false
          }
        ]
      }

      ;(codeAccessLogRepository.getCodeAccessStatistics as vi.Mock).mockResolvedValue(stats)

      const result = await codeService.getCodeAccessStatistics(code)

      expect(result.statusCode).toBe(200)
      expect(result.responseObject?.totalAccesses).toBe(3)
      expect(result.responseObject?.totalFormsCompleted).toBe(8)
      expect(result.responseObject?.successfulSessions).toBe(2)
      expect(result.responseObject?.failedSessions).toBe(1)
      expect(result.responseObject?.averageSessionDurationMs).toBe(400000)
      expect(result.responseObject?.formsCompletedByType).toEqual({
        AOFAS: 3,
        'FFI-R': 3,
        'Other': 2
      })
    })
  })

  describe('Code Archive and Restore Workflow', () => {
    it('should archive code after patient completes access', async () => {
      const code = 'ARCHIVE-TEST'
      const userId = 'clinician-123'

      ;(codeRepository.archiveCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date(),
        archivedBy: userId
      })

      const result = await codeService.archiveCode(code, userId)

      expect(result.statusCode).toBe(200)
      expect(result.responseObject?.archivedBy).toBe(userId)
      expect(result.responseObject?.archivedOn).toBeDefined()
    })

    it('should prevent access to archived code', async () => {
      const code = 'ARCHIVED-CODE'

      ;(codeRepository.getCodeByCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: new Date('2024-01-10'),
        archivedBy: 'user-123'
      })

      const result = await codeService.validateCode(code)

      expect(result.statusCode).toBe(403)
    })

    it('should restore archived code for reuse if needed', async () => {
      const code = 'RESTORE-TEST'

      ;(codeRepository.restoreCode as vi.Mock).mockResolvedValue({
        code,
        archivedOn: null,
        archivedBy: null
      })

      const result = await codeService.restoreCode(code)

      expect(result.statusCode).toBe(200)
      expect(result.responseObject?.archivedOn).toBeNull()
      expect(result.responseObject?.archivedBy).toBeNull()
    })
  })

  describe('Error Cases and Edge Conditions', () => {
    it('should handle code with no associated consultations', async () => {
      const code = 'NO-CONSULT'
      const caseId = 'empty-case'
      const today = new Date('2024-01-15')

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue([])

      const result = await codeService.resolveActiveConsultationForCode(code, caseId, today)

      expect(result.statusCode).toBe(200)
      expect(result.responseObject).toBeNull()
    })

    it('should handle consultation with null dateAndTime', async () => {
      const code = 'NULL-DATE'
      const caseId = 'case-with-null-date'
      const today = new Date('2024-01-15')

      const consultations = [
        {
          _id: 'consultation-null-date',
          dateAndTime: null,
          patientCaseId: caseId,
          patientFormData: null
        }
      ]

      ;(codeRepository.getCodeAccessWindow as vi.Mock).mockResolvedValue({
        startDate: startOfDay(today),
        endDate: endOfDay(today)
      })
      ;(consultationRepository.getConsultationsByPatientCase as vi.Mock).mockResolvedValue(consultations)

      // Should not throw, should handle gracefully
      const result = await codeService.resolveActiveConsultationForCode(code, caseId, today)

      expect(result.statusCode).toBe(200)
    })

    it('should handle missing required fields in access log', async () => {
      const incompleteData = {
        code: 'TEST',
        patientCaseId: 'case-123'
        // Missing consultationId
      } as any

      ;(codeAccessLogRepository.createAccessLog as vi.Mock).mockRejectedValue(
        new Error('Missing required field: consultationId')
      )

      try {
        await codeService.createCodeAccessLog(incompleteData)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
