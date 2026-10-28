export async function uploadFileDirect(api, signUrl, details, file) {
  const { data } = await api.post(signUrl, {
    ...details,
    originalName: file.name,
    contentType: file.type,
    size: file.size,
  });
  const ticket = data.data;
  const formData = new FormData();
  formData.append('cacheControl', '3600');
  formData.append('', file);

  const headers = { 'x-upsert': 'false' };
  if (ticket.publicKey) {
    headers.apikey = ticket.publicKey;
    headers.Authorization = `Bearer ${ticket.publicKey}`;
  }
  const response = await fetch(ticket.signedUrl, {
    method: 'PUT',
    headers,
    body: formData,
  });
  if (!response.ok) throw new Error('File upload to Supabase Storage failed.');
  return ticket;
}
