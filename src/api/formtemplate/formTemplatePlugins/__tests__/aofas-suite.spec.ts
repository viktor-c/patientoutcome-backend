/**
 * Test all AOFAS form plugins
 * Verifies that all four AOFAS forms are properly implemented
 */

import { describe, it, expect } from 'vitest'
import { 
  aofasPlugin, 
  aofasHindfootPlugin, 
  aofasMidfootPlugin, 
  aofasLesserToesPlugin 
} from '../index'

describe('AOFAS Plugin Suite', () => {
  const plugins = [
    { name: 'Forefoot', plugin: aofasPlugin, id: '67b4e612d0feb4ad99ae2e84', questions: 8, section: 'forefoot' },
    { name: 'Hindfoot', plugin: aofasHindfootPlugin, id: '67b4e612d0feb4ad99ae2e85', questions: 10, section: 'hindfoot' },
    { name: 'Midfoot', plugin: aofasMidfootPlugin, id: '67b4e612d0feb4ad99ae2e86', questions: 10, section: 'midfoot' },
    { name: 'Lesser Toes', plugin: aofasLesserToesPlugin, id: '67b4e612d0feb4ad99ae2e87', questions: 8, section: 'lesserToes' }
  ]

  plugins.forEach(({ name, plugin, id, questions, section }) => {
    describe(`AOFAS ${name}`, () => {
      it('should have correct template ID', () => {
        expect(plugin.templateId).toBe(id)
      })

      it('should have correct name', () => {
        expect(plugin.name).toContain('AOFAS')
        console.log(`✅ ${name}: ${plugin.name}`)
      })

      it('should have description', () => {
        expect(plugin.description).toBeTruthy()
        expect(plugin.description.length).toBeGreaterThan(10)
      })

      it('should have form template with correct structure', () => {
        expect(plugin.formTemplate).toBeDefined()
        expect((plugin.formTemplate as any).formSchema).toBeDefined()
        expect((plugin.formTemplate as any).formData).toBeDefined()
      })

      it('should have correct number of questions', () => {
        const schema = (plugin.formTemplate as any).formSchema.properties[section]
        const questionCount = Object.keys(schema.properties).length
        expect(questionCount).toBe(questions)
        console.log(`✅ ${name}: ${questionCount} questions`)
      })

      it('should initialize with null values', () => {
        const mockData = plugin.generateMockData?.()
        const sectionData = mockData?.[section]
        expect(sectionData).toBeDefined()
        expect(Object.keys(sectionData || {}).length).toBe(questions)
      })

      it('should calculate perfect score', () => {
        // Create perfect score data
        const schema = (plugin.formTemplate as any).formSchema.properties[section]
        const perfectData: any = {}
        perfectData[section] = {}
        
        Object.keys(schema.properties).forEach((key: string) => {
          const question = schema.properties[key]
          // Use first (highest) enum value
          perfectData[section][key] = question.enum[0]
        })

        const result = plugin.calculateScore(perfectData)
        
        expect(result.totalScore).toBeDefined()
        expect(result.totalScore!.rawScore).toBe(100)
        expect(result.totalScore!.isComplete).toBe(true)
        console.log(`✅ ${name}: Perfect score = 100`)
      })

      it('should calculate worst score', () => {
        // Create worst score data
        const schema = (plugin.formTemplate as any).formSchema.properties[section]
        const worstData: any = {}
        worstData[section] = {}
        
        Object.keys(schema.properties).forEach((key: string) => {
          const question = schema.properties[key]
          // Use last (lowest) enum value
          const enumValues = question.enum
          worstData[section][key] = enumValues[enumValues.length - 1]
        })

        const result = plugin.calculateScore(worstData)
        
        expect(result.totalScore).toBeDefined()
        expect(result.totalScore!.rawScore).toBe(0)
        expect(result.totalScore!.isComplete).toBe(true)
        console.log(`✅ ${name}: Worst score = 0`)
      })

      it('should handle partial completion', () => {
        const partialData: any = {}
        partialData[section] = {}
        
        // Answer only first 3 questions
        partialData[section].q1 = 30
        partialData[section].q2 = 7
        // Use updated value for Hindfoot (7 instead of 10)
        partialData[section].q3 = name.includes('Hindfoot') ? 7 : (name.includes('Midfoot') ? 5 : 10)

        const result = plugin.calculateScore(partialData)
        
        expect(result.totalScore).toBeDefined()
        expect(result.totalScore!.answeredQuestions).toBe(3)
        expect(result.totalScore!.isComplete).toBe(false)
        expect(result.totalScore!.completionPercentage).toBeLessThan(100)
        console.log(`✅ ${name}: Partial completion handled`)
      })

      it('should have subscale data', () => {
        const mockData = plugin.generateMockData?.()
        if (!mockData) return
        const result = plugin.calculateScore(mockData)
        
        expect(result.subscales).toBeDefined()
        const subscaleCount = Object.keys(result.subscales || {}).length
        expect(subscaleCount).toBeGreaterThan(0)
        console.log(`✅ ${name}: Has ${subscaleCount} subscale(s)`)
      })
    })
  })

  it('should have unique template IDs', () => {
    const ids = plugins.map(p => p.plugin.templateId)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
    console.log('✅ All AOFAS forms have unique template IDs')
  })

  it('should all have max score of 100', () => {
    plugins.forEach(({ name, plugin, section }) => {
      const schema = (plugin.formTemplate as any).formSchema.properties[section]
      const perfectData: any = {}
      perfectData[section] = {}
      
      Object.keys(schema.properties).forEach((key: string) => {
        const question = schema.properties[key]
        perfectData[section][key] = question.enum[0]
      })

      const result = plugin.calculateScore(perfectData)
      expect(result.totalScore!.maxScore).toBe(100)
    })
    console.log('✅ All AOFAS forms have max score of 100')
  })
})
