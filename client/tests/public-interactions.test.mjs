import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { AxiosError } from 'axios'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost:5173/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'MutationObserver', 'Event', 'MouseEvent', 'KeyboardEvent']) {
  globalThis[key] = dom.window[key]
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
dom.window.scrollTo = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { createElement: h, Fragment } = await import('react')
const { render, cleanup, screen, within, fireEvent, waitFor, act } = await import('@testing-library/react')
const { default: userEvent } = await import('@testing-library/user-event')
const { MemoryRouter, Routes, Route } = await import('react-router-dom')
const vite = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
  ssr: { external: ['lucide-react'] },
})

const [{ default: PublicLayout }, { default: Pathways }, { default: PathwayFinder }, { default: KnowledgeHub }, { default: ConsultationForm }, { default: api }, { default: studentApi }, { default: StudentLayout }, { default: StudentAuth }, { default: StudentDashboard }] = await Promise.all([
  vite.ssrLoadModule('/src/components/layout/PublicLayout.jsx'),
  vite.ssrLoadModule('/src/components/Pathways.jsx'),
  vite.ssrLoadModule('/src/components/PathwayFinder.jsx'),
  vite.ssrLoadModule('/src/components/KnowledgeHub.jsx'),
  vite.ssrLoadModule('/src/components/ui/ConsultationForm.jsx'),
  vite.ssrLoadModule('/src/api/client.js'),
  vite.ssrLoadModule('/src/api/studentApi.js'),
  vite.ssrLoadModule('/src/pages/student/StudentLayout.jsx'),
  vite.ssrLoadModule('/src/pages/student/StudentAuth.jsx'),
  vite.ssrLoadModule('/src/pages/student/StudentDashboard.jsx'),
])

const fixture = { content: {}, settings: {}, navigation: [], socialLinks: [], services: [], destinations: [], enquiryOptions: [] }
const requests = []
let respond
let studentSession
const reply = (config, data = {}) => ({ config, status: 200, statusText: 'OK', data, headers: {} })
const refusal = (config, status, data) => new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, { ...reply(config, data), status })

beforeEach(() => {
  requests.length = 0
  respond = (config) => reply(config, { success: true, data: { id: 1 } })
  studentSession = { student: null, csrfToken: null }
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/home') return reply(config, { success: true, data: fixture })
    if (config.url === '/api/seo/page') return reply(config, { success: true, data: null })
    requests.push({ config, payload: typeof config.data === 'string' ? JSON.parse(config.data) : config.data })
    return respond(config)
  }
  studentApi.defaults.adapter = async (config) => {
    if (config.url === '/api/student/session') return reply(config, { success: true, data: studentSession })
    requests.push({ config, payload: typeof config.data === 'string' ? JSON.parse(config.data) : config.data })
    return respond(config)
  }
})
afterEach(() => cleanup())
after(async () => { await vite.close(); dom.window.close() })

async function renderPublic(...components) {
  render(h(MemoryRouter, { initialEntries: ['/'] }, h(Routes, null,
    h(Route, { element: h(PublicLayout) }, h(Route, { index: true, element: h(Fragment, null, ...components.map((Component) => h(Component, { key: Component.name }))) })),
  )))
  await waitFor(() => assert.equal(Boolean(screen.queryByText('Loading G3B Education…')), false))
  return userEvent.setup()
}

function LegacyGuideSignup() { return h(KnowledgeHub, { allowSubscription: true }) }

test('public planning guide has no newsletter or email signup and offers an ungated download', async () => {
  await renderPublic(KnowledgeHub)
  assert.equal(screen.queryByRole('textbox'), null)
  assert.equal(screen.queryByRole('checkbox'), null)
  assert.equal(document.querySelector('.hub-form, .hub-newsletter'), null)
  assert.equal(screen.getByRole('link', { name: /Download your free guide/ }).getAttribute('href'), '/resources/g3b-global-education-guide.pdf')
  assert.equal(requests.length, 0)
})

test('shared navigation expands Services, supports ArrowDown, and restores focus on Escape', async () => {
  const user = await renderPublic()
  const menuToggle = screen.getByRole('button', { name: 'Open navigation menu' })
  await user.click(menuToggle)
  assert.equal(menuToggle.getAttribute('aria-expanded'), 'true')

  const servicesToggle = screen.getByRole('button', { name: 'Our Services' })
  await user.click(servicesToggle)
  const servicesPanel = document.getElementById('navigation-dropdown-2')
  assert.equal(servicesToggle.getAttribute('aria-expanded'), 'true')
  assert.equal(servicesPanel.hidden, false)
  assert.equal(servicesPanel.querySelectorAll('.dropdown-item-wrapper').length, 11)
  assert.ok(within(servicesPanel).getByRole('link', { name: /English Test Preparation/ }))
  assert.ok(within(servicesPanel).getByRole('link', { name: /View All Services/ }))

  await user.click(servicesToggle)
  assert.equal(servicesPanel.hidden, true)
  await user.click(servicesToggle)
  await user.keyboard('{ArrowDown}')
  await waitFor(() => assert.equal(document.activeElement, within(servicesPanel).getByRole('link', { name: /Career Counselling/ })))
  await user.keyboard('{Escape}')
  assert.equal(menuToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(servicesToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, menuToggle)
})

test('pathway tabs support Arrow/Home/End keyboard navigation, linked panels, and workshop booking', async () => {
  const user = await renderPublic(Pathways)
  const school = await screen.findByRole('tab', { name: /Grade 9/ })
  const university = screen.getByRole('tab', { name: 'University applicants' })
  const workshops = screen.getByRole('tab', { name: 'Schools & workshops' })
  const professionals = screen.getByRole('tab', { name: 'Working professionals' })
  assert.equal(school.getAttribute('aria-selected'), 'true')
  school.focus()
  await user.keyboard('{ArrowRight}')
  assert.equal(document.activeElement, university)
  assert.equal(university.getAttribute('aria-selected'), 'true')
  assert.equal(screen.getByRole('tabpanel').getAttribute('aria-labelledby'), university.id)
  await user.keyboard('{End}')
  assert.equal(document.activeElement, professionals)
  assert.match(screen.getByRole('tabpanel').textContent, /Executive education & MBA/)
  await user.keyboard('{ArrowRight}')
  assert.equal(document.activeElement, school)
  await user.keyboard('{End}{Home}{ArrowRight}{ArrowRight}')
  assert.equal(document.activeElement, workshops)
  assert.match(screen.getByRole('tabpanel').textContent, /School discovery modules/)
  await user.click(screen.getByRole('button', { name: /Discuss a workshop/ }))
  const dialog = screen.getByRole('dialog')
  assert.equal(within(dialog).getByLabelText(/Interested Service/).value, 'Career Counselling Workshops')
  assert.equal(document.body.style.overflow, 'hidden')
  await user.keyboard('{Escape}')
  assert.equal(screen.queryByRole('dialog'), null)
  assert.equal(document.body.style.overflow, '')
  assert.equal(document.activeElement.textContent, 'Discuss a workshop')
})

test('three-question finder requires answers, preserves Back selections, and prefills the real consultation modal', async () => {
  const user = await renderPublic(PathwayFinder)
  const finder = await screen.findByRole('region', { name: /world of possibility/ })
  assert.equal(within(finder).getByRole('button', { name: /Next question/ }).disabled, true)
  await user.click(within(finder).getByRole('radio', { name: /High school/ }))
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  await user.click(within(finder).getByRole('radio', { name: /Undergraduate/ }))
  await user.click(within(finder).getByRole('button', { name: /Back/ }))
  assert.equal(within(finder).getByRole('radio', { name: /High school/ }).checked, true)
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  assert.equal(within(finder).getByRole('radio', { name: /Undergraduate/ }).checked, true)
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  assert.equal(within(finder).getByRole('button', { name: /Continue to free consultation/ }).disabled, true)
  await user.click(within(finder).getByRole('radio', { name: 'Canada' }))
  await user.click(within(finder).getByRole('button', { name: /Continue to free consultation/ }))
  const dialog = screen.getByRole('dialog')
  assert.equal(within(dialog).getByLabelText(/Interested Service/).value, 'Grade 9+ Counselling')
  assert.equal(within(dialog).getByLabelText('Current class / status').value, 'high_school')
  assert.equal(within(dialog).getByLabelText('Target degree').value, 'ug')
  assert.equal(within(dialog).getByLabelText('Preferred Destination').value, 'Canada')
  assert.ok(within(dialog).getByText('Your pathway finder answers are included.'))
})

test('finder restart clears answers and open destinations stay editable for working professionals', async () => {
  const user = await renderPublic(PathwayFinder)
  const finder = await screen.findByRole('region', { name: /world of possibility/ })
  await user.click(within(finder).getByRole('radio', { name: /High school/ }))
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  await user.click(within(finder).getByRole('button', { name: 'Restart pathway finder' }))
  assert.equal(within(finder).getByRole('radio', { name: /High school/ }).checked, false)
  assert.equal(within(finder).getByRole('button', { name: /Next question/ }).disabled, true)
  await user.click(within(finder).getByRole('radio', { name: /Working professional/ }))
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  await user.click(within(finder).getByRole('radio', { name: /MBA/ }))
  await user.click(within(finder).getByRole('button', { name: /Next question/ }))
  await user.click(within(finder).getByRole('radio', { name: 'Open to options' }))
  await user.click(within(finder).getByRole('button', { name: /Continue to free consultation/ }))
  const dialog = screen.getByRole('dialog')
  assert.equal(within(dialog).getByLabelText(/Interested Service/).value, 'Mid-Career & Working Professionals')
  assert.equal(within(dialog).getByLabelText('Current class / status').value, 'working')
  assert.equal(within(dialog).getByLabelText('Target degree').value, 'mba')
  assert.equal(within(dialog).getByLabelText('Preferred Destination').value, '')
  assert.ok(within(dialog).getByText('Open to destinations'))
})

test('guide gate submits the guide source and exposes a downloadable PDF only after success', async () => {
  const user = await renderPublic(LegacyGuideSignup)
  assert.equal(document.querySelector('.hub-newsletter'), null)
  const guide = document.querySelector('.hub-guide')
  assert.equal(within(guide).queryByRole('link', { name: /Download your free guide/ }), null)
  await user.type(within(guide).getByLabelText('Your email address'), 'parent@example.com')
  await user.click(within(guide).getByRole('checkbox'))
  await user.click(within(guide).getByRole('button', { name: 'Get the guide' }))
  const download = await within(guide).findByRole('link', { name: /Download your free guide/ })
  assert.equal(requests[0].payload.source, 'guide')
  assert.equal(download.getAttribute('href'), '/resources/g3b-global-education-guide.pdf')
  assert.equal(download.hasAttribute('download'), true)
  const pdf = await readFile(new URL('../public/resources/g3b-global-education-guide.pdf', import.meta.url))
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.ok(pdf.length > 1000)
})

test('guide failure clears loading, preserves input, and supports a successful retry', async () => {
  respond = (config) => { throw refusal(config, 429, { error: 'Please wait before subscribing again.' }) }
  const user = await renderPublic(LegacyGuideSignup)
  const guide = document.querySelector('.hub-guide')
  await user.type(within(guide).getByLabelText('Your email address'), 'student@example.com')
  await user.click(within(guide).getByRole('checkbox'))
  await user.click(within(guide).getByRole('button', { name: 'Get the guide' }))
  await within(guide).findByRole('alert')
  assert.match(within(guide).getByRole('alert').textContent, /Please wait before subscribing again/)
  assert.equal(within(guide).getByRole('button', { name: 'Get the guide' }).disabled, false)
  assert.equal(within(guide).getByLabelText('Your email address').value, 'student@example.com')
  assert.equal(requests.length, 1)
  respond = (config) => reply(config, { success: true })
  await user.click(within(guide).getByRole('button', { name: 'Get the guide' }))
  await within(guide).findByRole('status')
  assert.equal(requests.length, 2)
})

test('consultation validates required fields without posting and shows backend field errors', async () => {
  const user = userEvent.setup()
  render(h(ConsultationForm, { theme: 'light' }))
  await user.click(screen.getByRole('button', { name: 'Book Free Counselling Session' }))
  assert.equal(requests.length, 0)
  assert.match(screen.getByRole('alert').textContent, /correct the highlighted fields/)
  assert.equal(screen.getByLabelText(/Full Name/).getAttribute('aria-invalid'), 'true')
  await user.type(screen.getByLabelText(/Full Name/), 'Asha Student')
  await user.type(screen.getByLabelText(/Email Address/), 'asha@example.com')
  await user.type(screen.getByLabelText(/Phone Number/), '9876543210')
  await user.selectOptions(screen.getByLabelText(/Interested Service/), 'Grade 9+ Counselling')
  respond = (config) => { throw refusal(config, 422, { error: 'Validation failed.', details: { email: 'Please use your primary email address.' } }) }
  await user.click(screen.getByRole('button', { name: 'Book Free Counselling Session' }))
  await screen.findByText('Please use your primary email address.')
  assert.equal(screen.getByRole('button', { name: 'Book Free Counselling Session' }).disabled, false)
  assert.equal(screen.getByLabelText(/Email Address/).getAttribute('aria-invalid'), 'true')
  assert.equal(requests.length, 1)
})

test('consultation prevents duplicate synchronous posts and keeps finder metadata in the stored payload', async () => {
  let complete
  respond = (config) => new Promise((resolve) => { complete = () => resolve(reply(config, { success: true, data: { id: 5 } })) })
  render(h(ConsultationForm, { theme: 'light', inModal: true, initialValues: {
    fullName: 'Asha Student', email: 'asha@example.com', phone: '9876543210',
    serviceInterest: 'Grade 9+ Counselling', preferredDestination: 'Canada',
    currentStatus: 'high_school', targetDegree: 'ug', leadSource: 'assessment',
  } }))
  const form = screen.getByRole('button', { name: 'Book Free Counselling Session' }).closest('form')
  act(() => { fireEvent.submit(form); fireEvent.submit(form) })
  await waitFor(() => assert.equal(requests.length, 1))
  assert.equal(screen.getByRole('button', { name: /Sending Enquiry/ }).disabled, true)
  assert.equal(requests[0].payload.currentStatus, 'high_school')
  assert.equal(requests[0].payload.targetDegree, 'ug')
  assert.equal(requests[0].payload.preferredDestination, 'Canada')
  assert.equal(requests[0].payload.leadSource, 'assessment')
  assert.equal(requests[0].payload.phone, '+91 9876543210')
  await act(async () => complete())
  assert.ok(screen.getByRole('heading', { name: 'Your enquiry has been received' }))
  assert.ok(screen.getByText(/Your appointment is not confirmed yet/))
})

test('guide blocks duplicate synchronous submissions while a request is pending', async () => {
  let complete
  respond = (config) => new Promise((resolve) => { complete = () => resolve(reply(config, { success: true })) })
  const user = await renderPublic(LegacyGuideSignup)
  const guide = document.querySelector('.hub-guide')
  await user.type(within(guide).getByLabelText('Your email address'), 'student@example.com')
  await user.click(within(guide).getByRole('checkbox'))
  const form = within(guide).getByRole('button', { name: 'Get the guide' }).closest('form')
  act(() => { fireEvent.submit(form); fireEvent.submit(form) })
  await waitFor(() => assert.ok(requests.length > 0))
  assert.equal(requests.length, 1)
  await act(async () => complete())
})

async function renderStudent(path) {
  render(h(MemoryRouter, { initialEntries: [path] }, h(Routes, null,
    h(Route, { element: h(PublicLayout) }, h(Route, { path: '/student', element: h(StudentLayout) },
      h(Route, { path: 'login', element: h(StudentAuth) }),
      h(Route, { path: 'register', element: h(StudentAuth, { register: true }) }),
      h(Route, { path: 'dashboard', element: h(StudentDashboard) }),
    )),
  )))
  return userEvent.setup()
}

const portalStudent = { id: 101, name: 'Asha Student', email: 'asha@example.com', phone: '+919876543210' }

test('private student route sends anonymous visitors to student sign in', async () => {
  await renderStudent('/student/dashboard')
  assert.ok(await screen.findByRole('heading', { name: 'Welcome back' }))
  assert.ok(screen.getByRole('link', { name: 'Create an account' }))
  assert.equal(requests.some((entry) => entry.config.url.includes('/api/admin/')), false)
})

test('student registration enters the private dashboard with meaningful empty state', async () => {
  respond = (config) => config.url === '/api/student/register'
    ? reply(config, { success: true, data: { student: portalStudent, csrfToken: 'student-specific-csrf' } })
    : reply(config, { success: true, data: { student: portalStudent, enquiries: [] } })
  const user = await renderStudent('/student/register')
  await screen.findByRole('heading', { name: 'Create your account' })
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Create student account' }).disabled, false))
  await user.type(screen.getByLabelText('Full name'), portalStudent.name)
  await user.type(screen.getByLabelText('Email address'), portalStudent.email)
  await user.type(screen.getByLabelText('Phone number, with country code'), portalStudent.phone)
  await user.type(screen.getByLabelText('Password'), 'ExampleStudentPass123!')
  await user.click(screen.getByRole('button', { name: 'Create student account' }))
  assert.ok(await screen.findByRole('heading', { name: 'Welcome, Asha.' }))
  assert.ok(await screen.findByRole('heading', { name: 'Let’s talk about your goals' }))
  assert.equal(screen.getByLabelText(/Email Address/).value, portalStudent.email)
  assert.equal(screen.getByLabelText(/Phone Number/).value, '9876543210')
  assert.equal(document.querySelector('meta[name="robots"]').content, 'noindex,nofollow,noarchive')
  assert.equal(requests[0].config.url, '/api/student/register')
})

test('student dashboard renders real server enquiries and signs out using student CSRF', async () => {
  studentSession = { student: portalStudent, csrfToken: 'student-specific-csrf' }
  respond = (config) => config.url === '/api/student/dashboard'
    ? reply(config, { success: true, data: { student: portalStudent, enquiries: [{ id: 57, serviceInterest: 'Career Counselling', status: 'new', message: 'Help me choose a suitable stream.', createdAt: '2026-10-21T10:00:00.000Z', preferredDate: '2026-10-25T00:00:00.000Z', preferredTime: 'Morning (9am–12pm IST)' }] } })
    : reply(config, { success: true, data: { message: 'Signed out.' } })
  const user = await renderStudent('/student/dashboard')
  assert.ok(await screen.findByRole('heading', { name: 'Career Counselling' }))
  assert.ok(screen.getByText('Enquiry received'))
  assert.ok(screen.getByText('Help me choose a suitable stream.'))
  assert.ok(screen.getByText(/Preferred contact:.*25 Oct 2026/))
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  assert.ok(await screen.findByRole('heading', { name: 'Welcome back' }))
  const logout = requests.find((entry) => entry.config.url === '/api/student/logout')
  assert.equal(logout.config.headers['X-Student-CSRF-Token'], 'student-specific-csrf')
  assert.equal(logout.config.headers['X-CSRF-Token'], undefined)
})

test('expired student sessions return to sign in without a dashboard redirect loop', async () => {
  studentSession = { student: portalStudent, csrfToken: 'student-specific-csrf' }
  respond = (config) => { throw refusal(config, 401, { error: 'Please sign in to your student account.' }) }
  await renderStudent('/student/dashboard')
  assert.ok(await screen.findByRole('heading', { name: 'Welcome back' }))
  assert.equal(requests.filter((entry) => entry.config.url === '/api/student/dashboard').length, 1)
})

test('booking saves optional preferred date and time, and echoes only student CSRF', async () => {
  studentSession = { student: portalStudent, csrfToken: 'student-specific-csrf' }
  render(h(ConsultationForm, { theme: 'light', initialValues: { fullName: portalStudent.name, email: portalStudent.email, phone: '9876543210', serviceInterest: 'Grade 9+ Counselling', leadSource: 'student-dashboard' } }))
  fireEvent.change(screen.getByLabelText('Preferred contact date (optional)'), { target: { value: '2099-12-20' } })
  fireEvent.change(screen.getByLabelText('Preferred time (optional, IST)'), { target: { value: 'Morning (9am–12pm IST)' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Book Free Counselling Session' }).closest('form'))
  await screen.findByRole('heading', { name: 'Your enquiry has been received' })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].payload.preferredDate, '2099-12-20')
  assert.equal(requests[0].payload.preferredTime, 'Morning (9am–12pm IST)')
  assert.equal(requests[0].config.headers['X-Student-CSRF-Token'], 'student-specific-csrf')
})
