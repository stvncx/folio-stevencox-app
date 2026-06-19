import { useState } from 'react'
import { apiPost } from './api'
import { streamGenerate } from './ws'

/** Drives an AI generation: POST to create the job, open the WS, stream tokens. */
export function useGenerate() {
  const [streaming, setStreaming] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  const run = async (startPath: string, body: unknown, wsPath: string): Promise<number> => {
    setStreaming(true); setPreview(''); setError('')
    try {
      const { job_id } = await apiPost(startPath, body)
      return await streamGenerate(wsPath, job_id, {
        onToken: (t) => setPreview((p) => p + t),
        onError: (m) => setError(m),
      })
    } catch (e: any) {
      setError(e.message || 'Generation failed.')
      throw e
    } finally {
      setStreaming(false)
    }
  }

  return { streaming, preview, error, run }
}
