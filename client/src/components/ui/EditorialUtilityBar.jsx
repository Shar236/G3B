import { useState, useEffect } from 'react'

const GLOBAL_HUBS = [
  { city: 'London', country: 'UK', temp: '16°C', condition: 'Partly Cloudy', icon: 'fas fa-cloud-sun', timeZone: 'Europe/London' },
  { city: 'Tokyo', country: 'Japan', temp: '22°C', condition: 'Clear Sky', icon: 'fas fa-moon', timeZone: 'Asia/Tokyo' },
  { city: 'New York', country: 'USA', temp: '19°C', condition: 'Sunny', icon: 'fas fa-sun', timeZone: 'America/New_York' },
  { city: 'Navi Mumbai', country: 'India', temp: '29°C', condition: 'Pleasant', icon: 'fas fa-temperature-half', timeZone: 'Asia/Kolkata' },
  { city: 'Berlin', country: 'Germany', temp: '15°C', condition: 'Crisp', icon: 'fas fa-wind', timeZone: 'Europe/Berlin' },
  { city: 'Sydney', country: 'Australia', temp: '18°C', condition: 'Mild', icon: 'fas fa-cloud', timeZone: 'Australia/Sydney' },
  { city: 'Toronto', country: 'Canada', temp: '14°C', condition: 'Cool Breeze', icon: 'fas fa-cloud-sun', timeZone: 'America/Toronto' },
]

export default function EditorialUtilityBar() {
  const [activeHubIndex, setActiveHubIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  const activeHub = GLOBAL_HUBS[activeHubIndex]

  // Update clock every second based on selected hub's timezone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      try {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: activeHub.timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: activeHub.timeZone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        setCurrentTime(timeFormatter.format(now))
        setCurrentDate(dateFormatter.format(now))
      } catch {
        setCurrentTime(now.toLocaleTimeString())
        setCurrentDate(now.toLocaleDateString())
      }
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [activeHub.timeZone])

  const nextHub = () => {
    setActiveHubIndex((prev) => (prev + 1) % GLOBAL_HUBS.length)
  }

  return (
    <div className="editorial-utility-bar" role="region" aria-label="Global Dispatch Status and Weather Widget">
      {/* Live Breaking Ticker / Beacon */}
      <div className="utility-beacon-item">
        <span className="live-pulse-indicator" aria-hidden="true" />
        <span className="utility-label uppercase font-bold text-accent">GLOBAL DISPATCH</span>
        <span className="utility-divider" aria-hidden="true">/</span>
        <span className="utility-text font-semibold">Fall 2026 Admissions Open</span>
      </div>

      {/* Date & Global Location Clock */}
      <div className="utility-time-item">
        <i className="far fa-calendar-alt text-accent" aria-hidden="true" />
        <span className="utility-text">{currentDate || 'Global Edition'}</span>
        <span className="utility-divider" aria-hidden="true">•</span>
        <i className="far fa-clock text-accent" aria-hidden="true" />
        <span className="utility-text font-mono font-semibold" aria-label={`Current time in ${activeHub.city}`}>
          {currentTime} <span className="text-xs opacity-75">({activeHub.city})</span>
        </span>
      </div>

      {/* Weather & Temperature Widget with High Contrast Badge Container */}
      <div className="utility-weather-widget">
        <button
          type="button"
          onClick={nextHub}
          className="weather-badge-btn"
          aria-label={`Current weather in ${activeHub.city}, ${activeHub.country}: ${activeHub.temp}, ${activeHub.condition}. Click to switch global hub.`}
          title="Click to view weather in next global study hub"
        >
          <span className="weather-icon-wrap" aria-hidden="true">
            <i className={activeHub.icon} />
          </span>
          <div className="weather-metric-group">
            <span className="weather-temp font-bold">{activeHub.temp}</span>
            <span className="weather-condition">{activeHub.condition}</span>
          </div>
          <span className="weather-city-pill">
            {activeHub.city} <i className="fas fa-arrows-rotate text-xs ml-1 opacity-70" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  )
}
