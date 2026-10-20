import { createContext, useContext, useState, useCallback } from 'react'

const CounsellingContext = createContext(null)

export function CounsellingProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialData, setInitialData] = useState({})

  const openModal = useCallback((data = {}) => {
    setInitialData(data)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setInitialData({})
  }, [])

  return (
    <CounsellingContext.Provider value={{ isOpen, initialData, openModal, closeModal }}>
      {children}
    </CounsellingContext.Provider>
  )
}

export function useCounsellingModal() {
  const ctx = useContext(CounsellingContext)
  if (!ctx) {
    throw new Error('useCounsellingModal must be used within a CounsellingProvider')
  }
  return ctx
}

export default CounsellingContext
