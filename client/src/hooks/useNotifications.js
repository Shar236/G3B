import { useSyncExternalStore } from 'react'
import { dismissNotification, getNotifications, notify, subscribeNotifications } from '../api/notifications.js'

export default function useNotifications() {
  const notifications = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications)
  return { notifications, notify, dismiss: dismissNotification }
}
