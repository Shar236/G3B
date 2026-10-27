-- Add India Admissions as editable service content and a managed SEO page.
INSERT INTO services
  (title,slug,subtitle,badge,icon,description,cta_label,image_url,sort_order,is_active)
SELECT 'India Admissions','india-admissions','College and university guidance in India',
  'India','fas fa-building-columns',
  'Guidance for Indian college and university applications, including course selection, eligibility, documents, deadlines and follow-ups.',
  'Get Admission Guidance','/images/services-campus.jpg',7,1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE slug='india-admissions');

INSERT INTO service_features (service_id,text,sort_order)
SELECT s.id, f.text, f.ord FROM services s
CROSS JOIN (VALUES
  ('College and university selection',1),
  ('Course and eligibility guidance',2),
  ('Application and document assistance',3),
  ('Deadline planning and follow-ups',4),
  ('Student counselling',5)
) AS f(text,ord)
WHERE s.slug='india-admissions'
  AND NOT EXISTS (SELECT 1 FROM service_features existing WHERE existing.service_id=s.id AND existing.text=f.text);

INSERT INTO pages (name,route,slug,page_type,template,status,is_indexable,is_system,published_at)
VALUES ('India Admissions','/services/india-admissions','india-admissions','service','default','published',1,1,now())
ON CONFLICT (route) DO NOTHING;

INSERT INTO page_seo (page_id,seo_title,meta_description,og_title,og_description,status)
SELECT id,'India Admissions | G3B Education',
  'Get guidance on Indian colleges, courses, eligibility, applications, documents and admission deadlines.',
  'India Admissions | G3B Education',
  'Plan your India college applications with practical course and eligibility guidance.',
  'published'
FROM pages WHERE route='/services/india-admissions'
ON CONFLICT (page_id) DO NOTHING;
