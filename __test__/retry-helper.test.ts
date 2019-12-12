const mockCore = jest.genMockFromModule('@actions/core') as any
mockCore.info = (message: string) => {
  info.push(message)
}
let info: string[]
let retryHelper: any

describe('retry-helper tests', () => {
  beforeAll(() => {
    // Mocks
    jest.setMock('@actions/core', mockCore)

    // Now import
    const retryHelperModule = require('../lib/retry-helper')
    retryHelper = new retryHelperModule.RetryHelper(3, 0, 0)
  })

  beforeEach(() => {
    // Reset info
    info = []
  })

  afterAll(() => {
    // Reset modules
    jest.resetModules()
  })

  it('first attempt succeeds', async () => {
    const actual = await retryHelper.execute(async () => {
      return 'some result'
    })
    expect(actual).toBe('some result')
    expect(info).toHaveLength(0)
  })

  it('second attempt succeeds', async () => {
    let attempts = 0
    const actual = await retryHelper.execute(() => {
      if (++attempts == 1) {
        throw new Error('some error')
      }

      return Promise.resolve('some result')
    })
    expect(attempts).toBe(2)
    expect(actual).toBe('some result')
    expect(info).toHaveLength(2)
    expect(info[0]).toBe('some error')
    expect(info[1]).toMatch(/Waiting .+ seconds before trying again/)
  })

  it('third attempt succeeds', async () => {
    let attempts = 0
    const actual = await retryHelper.execute(() => {
      if (++attempts < 3) {
        throw new Error(`some error ${attempts}`)
      }

      return Promise.resolve('some result')
    })
    expect(attempts).toBe(3)
    expect(actual).toBe('some result')
    expect(info).toHaveLength(4)
    expect(info[0]).toBe('some error 1')
    expect(info[1]).toMatch(/Waiting .+ seconds before trying again/)
    expect(info[2]).toBe('some error 2')
    expect(info[3]).toMatch(/Waiting .+ seconds before trying again/)
  })

  it('all attempts fail succeeds', async () => {
    let attempts = 0
    let error: Error = (null as unknown) as Error
    try {
      await retryHelper.execute(() => {
        throw new Error(`some error ${++attempts}`)
      })
    } catch (err) {
      error = err
    }
    expect(error.message).toBe('some error 3')
    expect(attempts).toBe(3)
    expect(info).toHaveLength(4)
    expect(info[0]).toBe('some error 1')
    expect(info[1]).toMatch(/Waiting .+ seconds before trying again/)
    expect(info[2]).toBe('some error 2')
    expect(info[3]).toMatch(/Waiting .+ seconds before trying again/)
  })
})
