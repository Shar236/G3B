import { query, queryOne } from '../config/db.js';
import { mapRow } from './catalogRepository.js';
import { appendDates } from '../utils/listFilters.js';

function partnerFilters(filters = {}) {
  const where = [];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where.push('p.status = ?');
    params.push(filters.status);
  }

  if (filters.organizationType) {
    where.push('p.organization_type = ?');
    params.push(filters.organizationType);
  }

  appendDates(where, params, filters, 'p');

  if (filters.search) {
    where.push('(p.full_name LIKE ? OR p.organization_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.location LIKE ? OR p.message LIKE ? OR p.id = ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term, Number.parseInt(filters.search, 10) || 0);
  }

  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export const partnerEnquiriesRepository = {
  async create(data) {
    const result = await query(
      `INSERT INTO partner_enquiries
         (full_name, organization_name, email, phone, country_code, organization_type, location, website_url, partnership_interest, message, status, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      [
        data.fullName,
        data.organizationName,
        data.email,
        data.phone,
        data.countryCode ?? null,
        data.organizationType,
        data.location,
        data.websiteUrl ?? null,
        data.partnershipInterest,
        data.message,
        data.ipAddress ?? null,
      ],
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const row = await queryOne(
      'SELECT * FROM partner_enquiries WHERE id = ? LIMIT 1',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async findRecentDuplicate({ email, phone, minutes = 2 }) {
    const row = await queryOne(
      `SELECT id, created_at FROM partner_enquiries
       WHERE email = ? AND phone = ? AND created_at > (NOW() - INTERVAL ? MINUTE)
       ORDER BY created_at DESC LIMIT 1`,
      [email, phone, minutes],
    );
    return row ? mapRow(row) : null;
  },

  async list({ page = 1, perPage = 20, sortBy = 'createdAt', sortDir = 'desc', ...filters } = {}) {
    const { clause, params } = partnerFilters(filters);
    const validSorts = {
      createdAt: 'p.created_at',
      fullName: 'p.full_name',
      organizationName: 'p.organization_name',
      status: 'p.status',
      email: 'p.email',
    };
    const orderCol = validSorts[sortBy] || 'p.created_at';
    const direction = sortDir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * perPage;

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM partner_enquiries p ${clause}`, params);
    const rows = await query(
      `SELECT p.* FROM partner_enquiries p
       ${clause}
       ORDER BY ${orderCol} ${direction}, p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const total = Number(totalRow.total);
    return {
      items: rows.map(mapRow),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  },

  async listForExport(filters = {}) {
    const { clause, params } = partnerFilters(filters);
    const rows = await query(
      `SELECT p.id, p.full_name, p.organization_name, p.email, p.phone, p.country_code,
              p.organization_type, p.location, p.website_url, p.partnership_interest,
              p.message, p.status, p.created_at, p.updated_at
       FROM partner_enquiries p
       ${clause}
       ORDER BY p.created_at DESC, p.id DESC`,
      params,
    );
    return rows.map(mapRow);
  },

  async update(id, payload) {
    const assignments = [];
    const values = [];
    const map = {
      status: payload.status,
      message: payload.message,
    };

    for (const [column, value] of Object.entries(map)) {
      if (value !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (assignments.length > 0) {
      await query(`UPDATE partner_enquiries SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
    }
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM partner_enquiries WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async stats() {
    const rows = await query(
      'SELECT status, COUNT(*) AS count FROM partner_enquiries GROUP BY status',
    );
    const counts = { total: 0, new: 0, contacted: 0, inDiscussion: 0, approved: 0, archived: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      counts.total += count;
      if (row.status === 'new') counts.new = count;
      else if (row.status === 'contacted') counts.contacted = count;
      else if (row.status === 'in_discussion') counts.inDiscussion = count;
      else if (row.status === 'approved') counts.approved = count;
      else if (row.status === 'archived') counts.archived = count;
    }
    return counts;
  },
};

export default partnerEnquiriesRepository;
