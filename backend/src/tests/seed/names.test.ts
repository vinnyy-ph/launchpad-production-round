import {
  mulberry32,
  slugifyEmailLocal,
  createPeopleGenerator,
} from '../../../prisma/seed/names'

describe('slugifyEmailLocal', () => {
  it('drops honorific prefixes and joins first token + last name', () => {
    expect(slugifyEmailLocal('Ma. Theresa', 'Dela Cruz')).toBe('theresa.delacruz')
  })
  it('lowercases and strips spaces/periods', () => {
    expect(slugifyEmailLocal('John Michael', 'Sta. Ana')).toBe('john.staana')
  })
  it('keeps a plain name intact', () => {
    expect(slugifyEmailLocal('Angelo', 'Galang')).toBe('angelo.galang')
  })
})

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('createPeopleGenerator', () => {
  it('is deterministic for the same seed', () => {
    const g1 = createPeopleGenerator(7)
    const g2 = createPeopleGenerator(7)
    expect([g1(), g1(), g1()]).toEqual([g2(), g2(), g2()])
  })
  it('produces 300 unique emails', () => {
    const g = createPeopleGenerator(1)
    const emails = new Set<string>()
    for (let i = 0; i < 300; i++) emails.add(g().email)
    expect(emails.size).toBe(300)
  })
  it('emails use the dgtechnologies.com domain', () => {
    const g = createPeopleGenerator(1)
    expect(g().email.endsWith('@dgtechnologies.com')).toBe(true)
  })
})
