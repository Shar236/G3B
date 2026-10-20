export const emptyEnquiry = {
  fullName: '', email: '', countryCode: '+91', phone: '', serviceInterest: '', preferredDestination: '',
  currentStatus: '', targetDegree: '', leadSource: 'site', message: '',
}

export function enquiryFormValues(record) {
  return Object.fromEntries(Object.keys(emptyEnquiry).map((key) => [key, record[key] ?? emptyEnquiry[key]]))
}

export function enquiryPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || (['currentStatus', 'targetDegree'].includes(key) ? null : '') : value]))
}

export default function EnquiryForm({ value, onChange, disabled = false, prefix = 'lead' }) {
  const field = (key) => ({ id: `${prefix}-${key}`, value: value[key], onChange: (event) => onChange((current) => ({ ...current, [key]: event.target.value })), disabled })
  return <>
    <div className="admin-grid-2">
      <div className="admin-field"><label htmlFor={`${prefix}-fullName`}>Full name *</label><input className="admin-input" {...field('fullName')} required minLength={2} maxLength={150} autoComplete="name" /></div>
      <div className="admin-field"><label htmlFor={`${prefix}-email`}>Email *</label><input className="admin-input" {...field('email')} required type="email" maxLength={190} autoComplete="email" /></div>
      <div className="admin-field"><label htmlFor={`${prefix}-countryCode`}>Country calling code</label><input className="admin-input" {...field('countryCode')} placeholder="+91" maxLength={10} pattern="\+[0-9]{1,4}" /></div>
      <div className="admin-field"><label htmlFor={`${prefix}-phone`}>Phone number *</label><input className="admin-input" {...field('phone')} type="tel" required pattern="[+]?[0-9][0-9\s\(\)\-]{6,19}" maxLength={21} autoComplete="tel" title="Enter a phone number containing 7–20 digits, spaces, brackets or hyphens." /></div>
      <div className="admin-field"><label htmlFor={`${prefix}-serviceInterest`}>Service category *</label><input className="admin-input" {...field('serviceInterest')} required minLength={2} maxLength={150} list={`${prefix}-services`} /><datalist id={`${prefix}-services`}><option>Grade 9+ Counselling</option><option>Study Abroad Counselling</option><option>Career Counselling Workshops</option><option>Working Professionals</option><option>MBA Admissions</option></datalist></div>
      <div className="admin-field"><label htmlFor={`${prefix}-preferredDestination`}>Preferred destination</label><input className="admin-input" {...field('preferredDestination')} maxLength={120} /></div>
      <div className="admin-field"><label htmlFor={`${prefix}-currentStatus`}>Current class / status</label><select className="admin-select" {...field('currentStatus')}><option value="">Not specified</option><option value="high_school">High school (Grade 9–12)</option><option value="college">College student / graduate</option><option value="working">Working professional</option></select></div>
      <div className="admin-field"><label htmlFor={`${prefix}-targetDegree`}>Target degree</label><select className="admin-select" {...field('targetDegree')}><option value="">Not specified</option><option value="ug">Undergraduate</option><option value="pg">Postgraduate</option><option value="mba">MBA / executive programme</option><option value="undecided">Exploring options</option></select></div>
    </div>
    <div className="admin-field"><label htmlFor={`${prefix}-leadSource`}>Source / funnel</label><input className="admin-input" {...field('leadSource')} maxLength={80} list={`${prefix}-sources`} /><datalist id={`${prefix}-sources`}><option>site</option><option>assessment</option><option>grade9</option><option>workshop</option><option>professional</option><option>referral</option></datalist></div>
    <div className="admin-field"><label htmlFor={`${prefix}-message`}>Original message</label><textarea className="admin-textarea" {...field('message')} rows={4} maxLength={2000} /></div>
  </>
}
