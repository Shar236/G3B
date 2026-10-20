import { useEffect, useState } from 'react'
import useNotifications from '../../hooks/useNotifications.js'
import './notifications.css'

function Notification({ notification, onDismiss }) {
  const [paused, setPaused] = useState(false)
  const { id, type, message, duration } = notification
  useEffect(() => {
    if (paused || duration <= 0) return undefined
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [duration, id, onDismiss, paused])

  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' }
  return (
    <div className={`g3b-notification g3b-notification--${type}`} role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <i className={`fas ${icons[type] || icons.info}`} aria-hidden="true" />
      <p>{message}</p>
      <button type="button" onClick={() => onDismiss(id)} aria-label="Dismiss notification">
        <i className="fas fa-xmark" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Render once beside the application so feedback survives route changes. */
export default function NotificationCenter() {
  const { notifications, dismiss } = useNotifications()
  return (
    <div className="g3b-notifications" aria-label="Notifications">
      {notifications.map((notification) => <Notification key={notification.id} notification={notification} onDismiss={dismiss} />)}
    </div>
  )
}
