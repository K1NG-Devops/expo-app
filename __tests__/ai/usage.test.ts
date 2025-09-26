import type { AIUsageRecord } from '@/lib/ai/usage'

// Mock react-native Platform to avoid RN environment in Node tests
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }), { virtual: true })

// Mock supabase module to avoid actual network calls if accidentally invoked
jest.mock('@/lib/supabase', () => ({
  assertSupabase: () => ({
    functions: { invoke: jest.fn() },
    auth: { getUser: jest.fn() },
  }),
}))

describe('getCombinedUsage (server-authoritative)', () => {
  it('returns server usage when available', async () => {
    const usage = await import('@/lib/ai/usage')
    const serverCounts: AIUsageRecord = {
      lesson_generation: 10,
      grading_assistance: 5,
      homework_help: 2,
    }

    const spyServer = jest.spyOn(usage, 'getServerUsage').mockResolvedValue(serverCounts)
    const spyLocal = jest.spyOn(usage, 'getUsage').mockResolvedValue({
      lesson_generation: 1,
      grading_assistance: 1,
      homework_help: 1,
    })

    const result = await usage.getCombinedUsage()

    expect(result).toEqual(serverCounts)
    expect(spyServer).toHaveBeenCalled()
    // When server is available, we should not need local, but getUsage may still be unused
    // We won't assert on spyLocal to avoid false negatives due to implementation detail

    spyServer.mockRestore()
    spyLocal.mockRestore()
  })

  it('falls back to local usage when server unavailable', async () => {
    const usage = await import('@/lib/ai/usage')
    const localCounts: AIUsageRecord = {
      lesson_generation: 3,
      grading_assistance: 4,
      homework_help: 5,
    }

    const spyServer = jest.spyOn(usage, 'getServerUsage').mockResolvedValue(null)
    const spyLocal = jest.spyOn(usage, 'getUsage').mockResolvedValue(localCounts)

    const result = await usage.getCombinedUsage()

    expect(result).toEqual(localCounts)
    expect(spyServer).toHaveBeenCalled()
    expect(spyLocal).toHaveBeenCalled()

    spyServer.mockRestore()
    spyLocal.mockRestore()
  })
})
