import { getToken } from './api'

export interface StreamHandlers {
  onToken: (text: string) => void
  onError?: (msg: string) => void
}

/**
 * Open the AI generation WebSocket, send {token, job_id}, stream tokens, and
 * resolve with the created record id on the `complete` message.
 */
export function streamGenerate(wsPath: string, jobId: number, h: StreamHandlers): Promise<number> {
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}${wsPath}`)
    let done = false
    ws.onopen = () => ws.send(JSON.stringify({ token: getToken(), job_id: jobId }))
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'token') h.onToken(msg.content)
      else if (msg.type === 'complete') { done = true; ws.close(); resolve(msg.record_id) }
      else if (msg.type === 'error') { done = true; h.onError?.(msg.message); ws.close(); reject(new Error(msg.message)) }
    }
    ws.onerror = () => { if (!done) reject(new Error('Connection error during generation.')) }
    ws.onclose = () => { if (!done) reject(new Error('Connection closed before generation finished.')) }
  })
}
