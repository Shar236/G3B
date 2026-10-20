const listeners = new Set()
let notifications = []
let nextId = 0

/** Display feedback from React handlers or the shared network layer. */
export function notify({ type = 'info', message, duration = 6000 }) {
  if (!message) return null
  const existing = notifications.find((item) => item.message === message && item.type === type)
  if (existing) return existing.id
  const notification = { id: ++nextId, type, message: String(message), duration }
  notifications = [...notifications.slice(-3), notification]
  for (const listener of listeners) listener()
  return notification.id
}

export function dismissNotification(id) {
  notifications = notifications.filter((item) => item.id !== id)
  for (const listener of listeners) listener()
}

export function subscribeNotifications(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getNotifications = () => notifications
