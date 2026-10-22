import studyAbroadRepository from '../repositories/studyAbroadRepository.js';
import ApiError from '../utils/ApiError.js';

export async function listUniversities(req,res){res.json({success:true,data:await studyAbroadRepository.universities(req.query)})}
export async function getUniversity(req,res){const item=await studyAbroadRepository.university(req.params.slug);if(!item)throw ApiError.notFound('University listing not found.');res.json({success:true,data:item})}
export async function listPrograms(req,res){res.json({success:true,data:await studyAbroadRepository.programs(req.query)})}
export async function getProgram(req,res){const item=await studyAbroadRepository.program(req.params.slug);if(!item)throw ApiError.notFound('Program listing not found.');res.json({success:true,data:item})}
export async function saveUniversity(req,res){res.json({success:true,data:await studyAbroadRepository.toggleUniversity(req.student.id,req.params.id,req.body.save)})}
export async function saveProgram(req,res){res.json({success:true,data:await studyAbroadRepository.toggleProgram(req.student.id,req.params.id,req.body.save)})}
export async function compareProgram(req,res){res.json({success:true,data:await studyAbroadRepository.toggleComparison(req.student.id,req.params.id,req.body.save)})}
export async function savePreferences(req,res){res.json({success:true,data:await studyAbroadRepository.savePreferences(req.student.id,req.body)})}
export async function recordRecent(req,res){const saved=await studyAbroadRepository.recordRecent(req.student.id,req.params.type,req.params.id);if(!saved)throw ApiError.notFound('Study abroad listing not found.');res.json({success:true,data:{saved:true}})}
export async function updateChecklist(req,res){res.json({success:true,data:await studyAbroadRepository.updateChecklist(req.student.id,req.params.key,req.body.completed)})}
