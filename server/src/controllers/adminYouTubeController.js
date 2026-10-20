import { youtubeSyncService } from '../services/youtubeSyncService.js';
import { recordAudit } from '../services/auditLog.js';

export async function list(_req, res) { res.json({ success: true, data: await youtubeSyncService.list() }); }
export async function status(_req, res) { res.json({ success: true, data: await youtubeSyncService.status() }); }
export async function sync(req, res) {
  const data = await youtubeSyncService.sync();
  await recordAudit(req, { action: 'youtube.sync', entityType: 'video', summary: 'Synchronized official YouTube channel metadata', changes: data.result });
  res.json({ success: true, data });
}
export async function register(req, res) {
  if (req.body.title) {
    const data = await youtubeSyncService.saveManual(req.body);
    await recordAudit(req, { action: 'youtube.saveManual', entityType: 'video', entityId: data.id, summary: 'Added or updated YouTube video manually', changes: { youtubeId: data.youtubeId, title: data.title, category: data.category } });
    return res.status(201).json({ success: true, data });
  }
  const data = await youtubeSyncService.register(req.body.url);
  await recordAudit(req, { action: 'youtube.register', entityType: 'video', entityId: data.id, summary: 'Registered a Shorts URL for verification', changes: { youtubeId: data.youtubeId, channelVerified: data.channelVerified } });
  res.status(201).json({ success: true, data });
}
export async function saveManual(req, res) {
  const data = await youtubeSyncService.saveManual(req.body);
  await recordAudit(req, { action: 'youtube.saveManual', entityType: 'video', entityId: data.id, summary: 'Added or updated YouTube video manually', changes: { youtubeId: data.youtubeId, title: data.title, category: data.category } });
  res.status(201).json({ success: true, data });
}
export async function update(req, res) {
  const data = await youtubeSyncService.update(req.params.id, req.body);
  await recordAudit(req, { action: 'youtube.review', entityType: 'video', entityId: data.id, summary: 'Reviewed Shorts publication and category', changes: { verifiedShort: data.verifiedShort, excluded: data.excluded, isActive: data.isActive, title: data.title, category: data.category, sortOrder: data.sortOrder } });
  res.json({ success: true, data });
}
export async function remove(req, res) {
  const data = await youtubeSyncService.remove(req.params.id);
  await recordAudit(req, { action: 'youtube.exclude', entityType: 'video', entityId: data.id, summary: 'Excluded video from the website and future imports' });
  res.json({ success: true, data });
}
