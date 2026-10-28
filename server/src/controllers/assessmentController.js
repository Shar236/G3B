import fs from 'node:fs';
import path from 'node:path';
import assessmentRepository from '../repositories/assessmentRepository.js';
import { assessmentReportsRoot } from '../middleware/upload.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { deleteObjects, downloadObject, storageBuckets } from '../services/supabaseStorage.js';
import logger from '../utils/logger.js';

export async function requestAssessment(req, res) {
  const listing = await assessmentRepository.findListing(req.params.id);
  if (!listing) throw ApiError.notFound('This assessment is not currently available.');
  const assignment = await assessmentRepository.request(req.student.id, listing.id);
  res.status(201).json({ success: true, data: assignment });
}

export async function downloadStudentReport(req, res) {
  const assignment = await assessmentRepository.assignmentForStudent(req.params.id, req.student.id);
  if (!assignment || assignment.status !== 'completed' || !assignment.reportFileName) throw ApiError.notFound('No completed report is available for this assessment.');
  if (assignment.reportFileName.startsWith('reports/')) {
    const { buffer, contentType } = await downloadObject(storageBuckets.private, assignment.reportFileName, {
      maxBytes: env.uploads.maxBytes,
    });
    const filename = (assignment.reportOriginalName || 'g3b-assessment-report.pdf').replace(/[\r\n"\\]/g, '_');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
    return;
  }
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
  if (typeof req.body?.storageKey === 'string') {
    const storageKey = req.body.storageKey;
    const originalName = req.body.originalName;
    if (!storageKey.startsWith(`reports/${req.params.id}/`) || path.extname(originalName || '').toLowerCase() !== '.pdf') {
      throw ApiError.badRequest('The uploaded assessment report reference is invalid.');
    }
    const existing = await assessmentRepository.findAssignmentById(req.params.id);
    if (!existing) throw ApiError.notFound('Assessment assignment not found.');
    const { buffer, contentType } = await downloadObject(storageBuckets.private, storageKey, {
      maxBytes: env.uploads.maxBytes,
    });
    if (contentType !== 'application/pdf' || buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw ApiError.badRequest('The uploaded file is not a valid PDF report.');
    }
    const updated = await assessmentRepository.updateAssignment(req.params.id, {
      reportFileName: storageKey,
      reportOriginalName: originalName,
      status: 'completed',
      progressPercent: 100,
    });
    if (!updated) throw ApiError.notFound('Assessment assignment not found.');
    if (existing.report_file_name?.startsWith('reports/') && existing.report_file_name !== storageKey) {
      try {
        await deleteObjects(storageBuckets.private, [existing.report_file_name]);
      } catch (error) {
        logger.warn('Could not remove a replaced assessment report', { status: error.status || 502 });
      }
    }
    res.json({ success: true, data: updated });
    return;
  }

  if (!req.file) throw ApiError.badRequest('Choose a PDF assessment report to upload.');
  const updated = await assessmentRepository.updateAssignment(req.params.id, {
    reportFileName: req.file.filename, reportOriginalName: req.file.originalname, status: 'completed', progressPercent: 100,
  });
  if (!updated) { fs.unlinkSync(req.file.path); throw ApiError.notFound('Assessment assignment not found.'); }
  res.json({ success: true, data: updated });
}
