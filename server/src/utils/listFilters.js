/** Parameterised conditions shared by list and CSV, so exports match the inbox. */
export function enquiryFilters(filters = {}) {
  const where = [];
  const params = [];
  if (!filters.includeAnonymized) where.push('e.anonymized_at IS NULL');
  for (const [field, column] of Object.entries({
    status: 'status', assignedTo: 'assigned_to', service: 'service_interest',
    destination: 'preferred_destination', leadSource: 'lead_source',
    currentStatus: 'current_status', targetDegree: 'target_degree',
  })) {
    if (filters[field]) { where.push(`e.${column} = ?`); params.push(filters[field]); }
  }
  if (filters.segment === 'school') {
    where.push("(e.current_status = 'high_school' OR e.lead_source IN ('grade9','school') OR e.service_interest LIKE '%Grade 9%' OR e.service_interest LIKE '%Stream%')");
  } else if (filters.segment === 'workshop') {
    where.push("(e.lead_source = 'workshop' OR e.service_interest LIKE '%Workshop%')");
  } else if (filters.segment === 'professional') {
    where.push("(e.current_status = 'working' OR e.lead_source = 'professional' OR e.service_interest LIKE '%Mid-Career%')");
  }
  appendDates(where, params, filters, 'e');
  if (filters.search) {
    where.push('(e.full_name LIKE ? OR e.email LIKE ? OR e.phone LIKE ? OR e.message LIKE ? OR e.id = ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, Number.parseInt(filters.search, 10) || 0);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export function appendDates(where, params, filters, alias) {
  if (filters.dateFrom) { where.push(`${alias}.created_at >= ?`); params.push(filters.dateFrom); }
  if (filters.dateTo) {
    // A date-only upper bound includes that entire local database day.
    where.push(/^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)
      ? `${alias}.created_at < (?::date + INTERVAL '1 day')` : `${alias}.created_at <= ?`);
    params.push(filters.dateTo);
  }
}

export function sortClause(sortBy, sortDir, columns, fallback = 'createdAt') {
  const column = columns[sortBy] || columns[fallback];
  return `${column} ${sortDir === 'asc' ? 'ASC' : 'DESC'}, id DESC`;
}
