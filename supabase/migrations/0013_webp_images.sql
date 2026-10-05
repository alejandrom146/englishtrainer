-- English Personal Trainer — imágenes de Describe the Image a WebP
-- Mismas 5 imágenes, mismo contenido — solo el formato de archivo cambió
-- (PNG → WebP, ~90% menos peso). Actualiza la única línea que hacía
-- falta: la ruta guardada en describe_image_exercises.

update public.describe_image_exercises
set image_path = replace(image_path, '.png', '.webp')
where image_path like '%.png';
