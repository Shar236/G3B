import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { parseApiError } from '../api/client.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const token = params.get('token')
  useDocumentMeta({ title: 'Unsubscribe | G3B Education', robots: 'noindex,nofollow' })
  async function unsubscribe() {
    setState('loading')
    try { await api.post('/api/subscribers/unsubscribe', { token }); setState('success'); setMessage('Your unsubscribe request has been processed.') }
    catch (error) { setState('error'); setMessage(parseApiError(error).message) }
  }
  return <section className="section"><div className="container article-container"><h1>Newsletter preferences</h1><p className="article-deck">{token ? 'Confirm below to stop receiving education updates from G3B Education.' : 'Please use the unsubscribe link included in your newsletter.'}</p>{message && <p role={state === 'error' ? 'alert' : 'status'}>{message}</p>}{token && state !== 'success' && <button type="button" className="btn btn-secondary" disabled={state === 'loading'} onClick={unsubscribe}>{state === 'loading' ? 'Updating…' : 'Confirm unsubscribe'}</button>}<p><Link className="insight-all-link" to="/">Back to home</Link></p></div></section>
}
