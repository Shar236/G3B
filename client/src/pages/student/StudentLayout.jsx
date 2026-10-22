import { Outlet } from 'react-router-dom'
import { StudentProvider } from '../../context/StudentContext.jsx'
import './student.css'

export default function StudentLayout() {
  return <StudentProvider><div className="student-portal"><Outlet /></div></StudentProvider>
}
