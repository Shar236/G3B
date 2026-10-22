import fs from 'node:fs';
import path from 'node:path';
import assessmentRepository from '../repositories/assessmentRepository.js';
import { assessmentReportsRoot } from '../middleware/upload.js';
import ApiError from '../utils/ApiError.js';

export async function requestAssessment(req, res) {
  const listing = await assessmentRepository.findListing(req.params.id);
  if (!listing) throw ApiError.notFound('This assessment is not currently available.');
  const assignment = await assessmentRepository.request(req.student.id, listing.id);
  res.status(201).json({ success: true, data: assignment });
}

export async function downloadStudentReport(req, res) {
  const assignment = await assessmentRepository.assignmentForStudent(req.params.id, req.student.id);
  if (!assignment || assignment.status !== 'completed' || !assignment.reportFileName) throw ApiError.notFound('No completed report is available for this assessment.');
  const filePath = path.resolve(assessmentReportsRoot, assignment.reportFileName);
  if (!filePath.startsWith(`${assessmentReportsRoot}${path.sep}`) || !fs.existsSync(filePath)) throw ApiError.notFound('The assessment report file is unavailable.');
  res.download(filePath, assignment.reportOriginalName || 'g3b-assessment-report.pdf');
}

export async function listAssignments(_req, res) {
  res.json({ success: true, data: await assessmentRepository.listAssignments() });
}

export async function updateAssignment(req, res) {
  const updated = await assessmentRepository.updateAssignment(req.params.id, req.body);
  if (!updated) throw ApiError.notFound('Assessment assignment not found.');
  res.json({ success: true, data: updated });
}

export async function uploadReport(req, res) {
  if (!req.file) throw ApiError.badRequest('Choose a PDF assessment report to upload.');
  const updated = await assessmentRepository.updateAssignment(req.params.id, {
    reportFileName: req.file.filename, reportOriginalName: req.file.originalname, status: 'completed', progressPercent: 100,
  });
  if (!updated) { fs.unlinkSync(req.file.path); throw ApiError.notFound('Assessment assignment not found.'); }
  res.json({ success: true, data: updated });
}
