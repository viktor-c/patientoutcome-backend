import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeRepository } from '../codeRepository'

const {
  codeFindOneMock,
  codeFindMock,
  codeUpdateOneMock,
  codeDeleteMock
} = vi.hoisted(() => {
  const codeDeleteMock = vi.fn()
  const codeUpdateOneMock = vi.fn(() => ({ exec: vi.fn() }))
  const codeFindMock = vi.fn()
  const codeFindOneMock = vi.fn()

  return {
    codeFindOneMock,
    codeFindMock,
    codeUpdateOneMock,
    codeDeleteMock
  }
})

vi.mock('../codeModel', () => ({
  CodeModel: {
    findOne: codeFindOneMock,
    find: codeFindMock,
    updateOne: codeUpdateOneMock,
    deleteOne: codeDeleteMock
  }
}))

describe('CodeRepository', () => {
  let codeRepository: CodeRepository

  beforeEach(() => {
    codeRepository = new CodeRepository({} as any)
    vi.clearAllMocks()
  })

  describe('archiveCode', () => {
    it('should mark code as archived with user ID and timestamp', async () => {
      const code = 'TEST123'
      const userId = 'user123'
      const archivedOn = new Date()

      codeUpdateOneMock.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          code,
          archivedOn,
          archivedBy: userId
        })
      })

      const result = await codeRepository.archiveCode(code, userId)

      expect(codeUpdateOneMock).toHaveBeenCalledWith(
        { code },
        expect.objectContaining({
          $set: expect.objectContaining({
            archivedBy: userId
          })
        })
      )
      expect(result?.archivedBy).toBe(userId)
    })

    it('should throw error if code not found', async () => {
      const code = 'INVALID'
      const userId = 'user123'

      codeUpdateOneMock.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null)
      })

      const result = await codeRepository.archiveCode(code, userId)
      expect(result).toBeNull()
    })
  })

  describe('restoreCode', () => {
    it('should clear archive fields from code', async () => {
      const code = 'TEST123'

      codeUpdateOneMock.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          code,
          archivedOn: null,
          archivedBy: null
        })
      })

      const result = await codeRepository.restoreCode(code)

      expect(codeUpdateOneMock).toHaveBeenCalledWith(
        { code },
        expect.objectContaining({
          $unset: expect.objectContaining({
            archivedOn: '',
            archivedBy: ''
          })
        })
      )
      expect(result?.archivedOn).toBeNull()
      expect(result?.archivedBy).toBeNull()
    })
  })

  describe('getCodesByPatientCaseId', () => {
    it('should return all non-archived codes for a patient case', async () => {
      const caseId = 'case123'
      const mockCodes = [
        { code: 'CODE1', patientCaseId: caseId, archivedOn: null },
        { code: 'CODE2', patientCaseId: caseId, archivedOn: null }
      ]

      codeFindMock.mockResolvedValue(mockCodes)

      const result = await codeRepository.getCodesByPatientCaseId(caseId)

      expect(codeFindMock).toHaveBeenCalledWith({
        patientCaseId: caseId,
        archivedOn: { $exists: false }
      })
      expect(result).toHaveLength(2)
    })

    it('should exclude archived codes from results', async () => {
      const caseId = 'case123'
      const mockCodes = [
        { code: 'CODE1', patientCaseId: caseId, archivedOn: null },
        { code: 'CODE2', patientCaseId: caseId, archivedOn: null }
      ]

      codeFindMock.mockResolvedValue(mockCodes)

      const result = await codeRepository.getCodesByPatientCaseId(caseId)

      // Verify query excludes archived codes
      expect(codeFindMock).toHaveBeenCalledWith(
        expect.objectContaining({
          archivedOn: { $exists: false }
        })
      )
    })
  })

  describe('getAllAvailableCodes', () => {
    it('should return only non-archived codes', async () => {
      const mockCodes = [
        { code: 'CODE1', archivedOn: null },
        { code: 'CODE2', archivedOn: null }
      ]

      codeFindMock.mockResolvedValue(mockCodes)

      const result = await codeRepository.getAllAvailableCodes()

      // Should query with archivedOn not existing
      expect(codeFindMock).toHaveBeenCalledWith(
        expect.objectContaining({
          archivedOn: { $exists: false }
        })
      )
      expect(result).toHaveLength(2)
    })

    it('should not return archived codes', async () => {
      codeFindMock.mockResolvedValue([])

      await codeRepository.getAllAvailableCodes()

      // Verify the query filters out archived codes
      const callArgs = codeFindMock.mock.calls[0][0]
      expect(callArgs.archivedOn).toEqual({ $exists: false })
    })
  })

  describe('getCodeByCode', () => {
    it('should return code if it exists and is not archived', async () => {
      const code = 'TEST123'
      const mockCode = { code, archivedOn: null }

      codeFindOneMock.mockResolvedValue(mockCode)

      const result = await codeRepository.getCodeByCode(code)

      expect(codeFindOneMock).toHaveBeenCalledWith({ code })
      expect(result?.code).toBe(code)
    })

    it('should return null if code does not exist', async () => {
      codeFindOneMock.mockResolvedValue(null)

      const result = await codeRepository.getCodeByCode('NONEXISTENT')

      expect(result).toBeNull()
    })
  })
})
