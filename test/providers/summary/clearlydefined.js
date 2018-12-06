// Copyright (c) Microsoft Corporation and others. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const assert = require('assert')
const summarizer = require('../../../providers/summary/clearlydefined')()
const { get } = require('lodash')

describe('ClearlyDescribedSummarizer addLicenseFromFiles', () => {
  it('declares MIT license from license file', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'LICENSE',
        token: 'abcd',
        license: 'MIT'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed.declared, 'MIT')
  })

  it('declares MIT license from license file in package folder for npm', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'package/LICENSE',
        token: 'abcd',
        license: 'MIT'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles }, { type: 'npm' })
    assert.strictEqual(result.licensed.declared, 'MIT')
  })

  it('declares nothing from license file in package folder for nuget', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'package/LICENSE',
        token: 'abcd',
        license: 'MIT'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles }, { type: 'nuget' })
    assert.strictEqual(result.licensed, undefined)
  })

  it('declares spdx license expression from multiple license files', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'LICENSE',
        token: 'abcd',
        license: 'MIT'
      },
      {
        path: 'LICENSE.html',
        token: 'abcd',
        license: '0BSD'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed.declared, 'MIT AND 0BSD')
  })

  it('declares single license for multiple similar license files', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'LICENSE',
        token: 'abcd',
        license: 'MIT'
      },
      {
        path: 'LICENSE.html',
        token: 'abcd',
        license: 'MIT'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed.declared, 'MIT')
  })

  it('declares nothing from non-license files with valid license', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'not-A-License',
        token: 'abcd',
        license: 'MIT'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed, undefined)
  })

  it('declares nothing from license files with no license', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'LICENSE',
        token: 'abcd'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed, undefined)
  })

  it('declares nothing from license files with NOASSERTION', () => {
    const result = {}
    const interestingFiles = [
      {
        path: 'LICENSE',
        token: 'abcd',
        license: 'NOASSERTION'
      }
    ]
    summarizer.addLicenseFromFiles(result, { interestingFiles })
    assert.strictEqual(result.licensed, undefined)
  })
})

describe('ClearlyDescribedSummarizer addInterestingFiles', () => {
  it('should filter invalid license properties', () => {
    const data = new Map([
      [{ path: 'LICENSE', token: 'abcd', license: 'MIT' }, { path: 'LICENSE', token: 'abcd', license: 'MIT' }],
      [{ path: 'LICENSE', token: 'abcd', license: 'mit' }, { path: 'LICENSE', token: 'abcd', license: 'MIT' }],
      [{ path: 'LICENSE', token: 'abcd', license: 'NOASSERTION' }, { path: 'LICENSE', token: 'abcd' }],
      [{ path: 'LICENSE', token: 'abcd' }, { path: 'LICENSE', token: 'abcd' }]
    ])
    for (let test of data) {
      let result = {}
      summarizer.addInterestingFiles(result, { interestingFiles: [test[0]] })
      assert.deepEqual(result, { files: [test[1]] })
    }
  })

  it('should merge existing files', () => {
    let result = { files: [{ path: 'file1' }] }
    summarizer.addInterestingFiles(result, { interestingFiles: [{ path: 'LICENSE', token: 'abcd', license: 'MIT' }] })
    assert.deepEqual(result, { files: [{ path: 'file1' }, { path: 'LICENSE', token: 'abcd', license: 'MIT' }] })
  })

  it('should merge the same file', () => {
    let result = { files: [{ path: 'LICENSE', license: 'MIT' }] }
    summarizer.addInterestingFiles(result, { interestingFiles: [{ path: 'LICENSE', token: 'abcd', license: 'MIT' }] })
    assert.deepEqual(result, { files: [{ path: 'LICENSE', token: 'abcd', license: 'MIT' }] })
  })
})

describe('ClearlyDescribedSummarizer addCrateData', () => {
  it('declares license from registryData', () => {
    let result = {}
    summarizer.addCrateData(result, { registryData: { license: 'MIT' } })
    assert.strictEqual(get(result, 'licensed.declared'), 'MIT')
  })

  it('declares dual license from registryData', () => {
    let result = {}
    summarizer.addCrateData(result, { registryData: { license: 'MIT/Apache-2.0' } })
    assert.strictEqual(get(result, 'licensed.declared'), 'MIT OR Apache-2.0')
  })

  it('normalizes to spdx only', () => {
    let result = {}
    summarizer.addCrateData(result, { registryData: { license: 'Garbage' } })
    assert.strictEqual(get(result, 'licensed.declared'), undefined)
  })

  it('normalizes to spdx only with slashes', () => {
    let result = {}
    summarizer.addCrateData(result, { registryData: { license: 'Garbage/Junk' } })
    assert.strictEqual(get(result, 'licensed.declared'), undefined)
  })

  it('decribes projectWebsite from manifest', () => {
    let result = {}
    summarizer.addCrateData(result, { manifest: { homepage: 'https://github.com/owner/repo' } })
    assert.strictEqual(result.described.projectWebsite, 'https://github.com/owner/repo')
  })

  it('decribes releaseDate from registryData', () => {
    let result = {}
    summarizer.addCrateData(result, { registryData: { created_at: '2018-06-01T21:41:57.990052+00:00' } })
    assert.strictEqual(result.described.releaseDate, '2018-06-01')
  })
})
