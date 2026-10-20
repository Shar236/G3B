import bcrypt from 'bcryptjs';
import { usersRepository } from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';

/** GET /api/admin/users */
export async function listUsers(_req, res) {
  res.json({ success: true, data: await usersRepository.list() });
}

/** POST /api/admin/users */
export async function createUser(req, res) {
  const { name, email, password, role = 'staff', status = 'active' } = req.body;

  const existing = await usersRepository.findByEmail(email);
  if (existing) throw ApiError.conflict('A user with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await usersRepository.create({ name, email, passwordHash, role, status });
  res.status(201).json({ success: true, data: user });
}

/** PATCH /api/admin/users/:id */
export async function updateUser(req, res) {
  const target = await usersRepository.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found.');

  const { name, email, password, role, status } = req.body;

  // Never let the last active administrator be demoted or disabled.
  const isDemoting = (role && role !== 'admin') || (status && status !== 'active');
  if (target.role === 'admin' && isDemoting) {
    const adminCount = await usersRepository.countAdmins();
    if (adminCount <= 1) {
      throw ApiError.badRequest('At least one active administrator must remain.');
    }
  }

  if (email && email !== target.email) {
    const existing = await usersRepository.findByEmail(email);
    if (existing && existing.id !== target.id) throw ApiError.conflict('That email is already in use.');
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  const user = await usersRepository.update(req.params.id, { name, email, role, status, passwordHash });
  res.json({ success: true, data: user });
}

/** DELETE /api/admin/users/:id */
export async function deleteUser(req, res) {
  const target = await usersRepository.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found.');

  if (Number(req.params.id) === Number(req.user.id)) {
    throw ApiError.badRequest('You cannot delete your own account.');
  }
  if (target.role === 'admin') {
    const adminCount = await usersRepository.countAdmins();
    if (adminCount <= 1) throw ApiError.badRequest('At least one active administrator must remain.');
  }

  await usersRepository.remove(req.params.id);
  res.json({ success: true, data: { message: 'User deleted.' } });
}

export default { listUsers, createUser, updateUser, deleteUser };
