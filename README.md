# English Personal Trainer

Esqueleto inicial: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (auth + Postgres).

Este entorno de chat no tiene acceso a internet, así que este proyecto **no
se ha instalado ni ejecutado aquí** — está listo para que lo descargues y lo
corras en tu máquina.

## Qué incluye esta primera entrega

- Landing page con la identidad visual del producto.
- Registro / inicio de sesión con Supabase Auth (email + contraseña).
- Middleware que protege `/dashboard` (redirige a `/login` si no hay sesión).
- Dashboard placeholder: streak, "today's challenge" y barras de habilidad
  (con datos de ejemplo — aún no conectado a datos reales).
- Migración SQL inicial: tabla `profiles` ligada a `auth.users`, con RLS
  (cada usuario solo ve su propio perfil) y un trigger que crea el perfil
  automáticamente al registrarse.

## Qué NO incluye todavía (a propósito)

Pronunciación real (Pronunciation Lab), daily challenge automático, XP,
error profile agregado... Eso llega en los siguientes módulos.

## Puesta en marcha

1. **Instala dependencias**

   ```bash
   npm install
   ```

2. **Crea un proyecto en [supabase.com](https://supabase.com)** (tier
   gratuito es suficiente para empezar).

3. **Copia las variables de entorno**

   ```bash
   cp .env.example .env.local
   ```

   Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde
   *Project Settings → API* en el panel de Supabase.

4. **Aplica la migración inicial**

   Opción rápida: pega el contenido de `supabase/migrations/0001_init.sql`
   en el *SQL Editor* del panel de Supabase y ejecútalo.

   (Alternativa más avanzada: instalar la Supabase CLI y usar
   `supabase db push` — no es necesario para esta primera entrega.)

5. **Activa la confirmación por email** (opcional en desarrollo): en
   *Authentication → Providers → Email*, puedes desactivar "Confirm email"
   mientras pruebas en local, para no depender de un servidor de correo.

6. **Arranca el proyecto**

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000`, crea una cuenta y deberías llegar al
   dashboard.

## Módulo de vocabulario (añadido)

Ya funciona la práctica de vocabulario con repetición espaciada (SM-2
simplificado): `/dashboard/vocabulary`.

**Para activarlo:**

1. Aplica `supabase/migrations/0002_core_schema.sql` (si aún no lo hiciste).
2. Aplica `supabase/migrations/0003_seed_vocabulary.sql` — carga 15 palabras
   de prueba en inglés británico, orientadas a atención al cliente.
3. `npm run dev`, inicia sesión y pulsa "Practicar vocabulario" en el
   dashboard.

**Cómo funciona:**

- Cada palabra nueva que ves se guarda en `user_vocabulary` (máximo 8
  nuevas por día).
- Al revisar, tú te autoevalúas (Otra vez / Difícil / Bien / Fácil); el
  sistema recalcula `ease_factor`, `interval_days` y `due_at` con SM-2, y
  decide cuándo te la vuelve a mostrar — no simplemente "mañana".
- El estado de la palabra (`new → recognition → understanding → recall`)
  avanza con las repeticiones. Los estados siguientes (`pronunciation`,
  `active_use`, `spontaneous_use`, `mastered`) los actualizarán el módulo
  de Pronunciation Lab y el de Conversación cuando los construyamos —
  todavía no existen.
- Sin audio ni análisis de pronunciación por ahora: eso depende de
  integrar Text-to-Speech / Speech-to-Text, que es su propio módulo.

## Connector Challenge (añadido)

`/dashboard/connectors` — te hace una pregunta abierta, respondes hablando
(o escribiendo), y la IA analiza si usaste conectores, si los usaste bien y
cuáles podrías haber usado.

**Para activarlo:**

1. Aplica `supabase/migrations/0004_grants.sql` (si aún no lo hiciste — sin
   esto, cualquier módulo nuevo va a fallar con "permission denied").
2. Aplica `supabase/migrations/0005_connector_challenge.sql` — carga 19
   conectores (como `expressions` con `type = 'connector'`) y 7 preguntas
   abiertas.
3. Consigue una clave de Gemini gratis en
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey) y
   ponla en `AI_API_KEY` dentro de `.env.local` (si ya la tenías puesta,
   perfecto).
4. También necesitas `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (está en
   *Project Settings → API* junto a la anon key) — se usa para registrar el
   consumo de IA sin exponerlo a los usuarios.

**Cómo funciona:**

- El micrófono usa el reconocimiento de voz del propio navegador (gratis,
  mejor soporte en Chrome/Edge); si no está disponible, escribe tu
  respuesta directamente.
- La IA (Gemini, modelo económico "flash-lite") solo evalúa conectores de
  la lista que cargamos — no inventa otros.
- Los conectores usados correcta y naturalmente hacen avanzar su estado de
  aprendizaje en `user_expressions` (pueden llegar hasta `active_use` o
  `spontaneous_use` — algo que el módulo de vocabulario, al ser solo
  repaso pasivo, no puede hacer por sí solo).
- Cada llamada a Gemini se registra en `ai_usage_events` (tokens, modelo)
  para control de costo, aunque los límites diarios/mensuales todavía no
  se aplican — eso queda para cuando la app tenga más de un usuario real.

## Conversación con IA (añadido)

`/dashboard/conversation` — elige un escenario (casual, travel, customer
service con niveles 1-10, job interview con modo "mock interview") y
conversa de verdad: hablas (o escribes), la IA responde como una persona
real, y al salir te genera un Conversation Report.

**Para activarlo:**

1. Aplica `supabase/migrations/0006_conversation_scenarios.sql` (después de
   `0002`, `0004` y `0005`).
2. Ya usa el mismo `AI_API_KEY` (Gemini) que el Connector Challenge — no
   hace falta nada nuevo en `.env.local`.

**Cómo funciona:**

- Flujo por turnos (no llamada de voz en tiempo real): mantén presionado el
  micrófono para hablar (Web Speech API del navegador, gratis) — al
  soltarlo, se envía automáticamente. También puedes escribir.
- Las respuestas de la IA se leen en voz alta con la síntesis de voz del
  propio navegador (`speechSynthesis`) — sin costo de API.
- La IA prioriza la comunicación sobre la corrección: no te interrumpe por
  cada error, solo si bloquea el entendimiento. La corrección detallada
  llega en el reporte final.
- Al pulsar "Exit", se genera el **Conversation Report**: fluency score,
  fortalezas, errores importantes de gramática, vocabulario que faltó,
  conectores usados/perdidos y una recomendación para la próxima sesión.
- Los conectores usados correcta y naturalmente actualizan
  `user_expressions` igual que en el Connector Challenge (comparten la
  misma lógica en `src/lib/connectors.ts`).
- Cada llamada a la IA (inicio, cada mensaje, el reporte final) queda
  registrada en `ai_usage_events` para control de costo — revisa esa tabla
  de vez en cuando si te preocupa el gasto.

**Limitación conocida:** el reconocimiento y la síntesis de voz del
navegador funcionan mejor en Chrome/Edge de escritorio y Android; en iOS
Safari el soporte es más limitado — si falla, el campo de texto siempre
funciona como respaldo.

## Pronunciation Lab (añadido)

`/dashboard/pronunciation` — grabas tu intento de pronunciar una palabra y
la IA (Gemini, que acepta audio directamente) te da feedback específico,
no solo un número.

**Para activarlo:** no necesita ninguna migración nueva — reutiliza
`pronunciation_attempts` y `error_profile`, ya creadas en `0002`. Solo
necesitas dar permiso de micrófono en el navegador la primera vez.

**Cómo funciona:**

- Prioriza palabras que ya llegaste a recordar (`state = 'recall'`) en el
  módulo de vocabulario — es el siguiente paso lógico según la secuencia
  del prompt maestro (`... → recall → pronunciation → ...`).
- Grabas con el micrófono del navegador; el audio se convierte a WAV en tu
  propio navegador (por compatibilidad con la API) y se envía a Gemini
  junto con la palabra objetivo y su significado.
- El audio **no se guarda** en ningún lado — ni en Supabase ni en disco —
  solo se analiza y se descarta. Lo que sí se guarda es el resultado:
  transcripción aproximada, score estimado, feedback y sonidos
  problemáticos.
- El score es una **estimación por IA escuchando el audio**, no una medición
  fonética precisa — se lo decimos así al usuario en la propia UI, tal
  como pide la sección 13 del prompt maestro (no fingir precisión falsa).
- Si el score es alto, la palabra avanza a `state = 'pronunciation'`. Los
  sonidos problemáticos detectados (ej. "TH", "final consonants") se
  acumulan en `error_profile` con su frecuencia — la base para, más
  adelante, generar ejercicios dirigidos a esos sonidos específicos.

## Dashboard con datos reales (añadido)

El dashboard ya no muestra números de ejemplo: `skill_scores`, streak, XP y
nivel se calculan a partir de tu actividad real.

**Para activarlo:** no necesita ninguna migración nueva.

**Cómo funciona:**

- **Skills**: se recalculan cada vez que abres el dashboard (sin costo de
  IA, es solo agregación). Vocabulary y Connectors salen del estado
  (`new`→`mastered`) de tus palabras/conectores; Pronunciation del
  promedio de tus últimos intentos; Fluency y Grammar de tus
  `conversation_feedback`; Customer Service es lo mismo que Fluency pero
  solo de conversaciones de esa categoría. **Listening no aparece
  todavía** — no hay ningún módulo que genere esos datos, y preferimos
  omitirlo antes que inventar un número (sección 13 del prompt maestro).
- **Streak**: cuenta días consecutivos con al menos una actividad real
  (revisión de vocabulario, connector challenge, pronunciación o
  conversación) — no se corta hasta medianoche si hoy todavía no
  practicaste.
- **XP y nivel**: cada acción ya otorga XP (revisar una palabra, completar
  el Connector Challenge, un intento de pronunciación, terminar una
  conversación) — se guarda en `xp_events` y se suma en el dashboard.

## Motor del Daily Challenge (añadido)

`/dashboard/daily-challenge` — arma automáticamente la sesión del día
combinando los 4 módulos, y le da más minutos al que más lo necesita.

**Para activarlo:** no necesita ninguna migración nueva — reutiliza
`daily_challenges`, ya creada en `0002`.

**Cómo funciona:**

- El total de la sesión varía entre 30 y 45 minutos según el día del mes
  (no aleatorio — así no cambia si recargás la página el mismo día, pero
  tampoco es siempre igual, como pide la sección 2 del prompt maestro).
- El reparto de minutos es **lógica determinista, sin IA de por medio**:
  mira tus `skill_scores` y le da más tiempo al módulo cuya habilidad
  asociada esté más baja (Vocabulary, Connectors, Pronunciation o
  Fluency/Conversación). Un skill sin datos todavía recibe prioridad media
  — ni la más alta ni la más baja — para animarte a probarlo.
- Cada bloque se marca como "hecho" automáticamente al detectar actividad
  real de ese tipo hecha HOY (ej. al menos 3 revisiones de vocabulario, o
  al menos 1 intento de pronunciación) — no hay un botón de "marcar como
  completado" que se pueda hacer trampa.
- La "Smart Recommendation" (por qué se armó así el plan) es texto
  generado con una plantilla simple, no una llamada a IA — es información
  que ya tenemos calculada, así que hacerla con IA sería gastar sin
  necesidad.

## Listening (añadido)

`/dashboard/listening` — dos modos: **Conversation Listening** (escuchás
una conversación entre dos personas y contás qué entendiste, con tus
propias palabras) y **Dictation** (escuchás una frase y la escribís
exactamente).

**Para activarlo:**

1. Aplica `supabase/migrations/0007_listening.sql` — extiende
   `listening_exercises` y `user_listening_attempts` (ya existían desde
   `0002`) con las columnas que necesita este módulo, amplía qué categorías
   acepta `error_profile`, y carga 4 conversaciones + 8 frases de dictation.
2. No hace falta nada nuevo en `.env.local` — Conversation Listening
   reutiliza el mismo `AI_API_KEY` (Gemini) que Connector Challenge y
   Conversación; Dictation no usa IA para nada.
3. **Importante:** si ya habías abierto el Daily Challenge de hoy antes de
   este cambio, ese registro no va a incluir los bloques de Listening
   (quedaron guardados con la lista de módulos vieja). Se va a corregir
   solo, mañana, cuando se genere el reto del día siguiente.

**Cómo funciona (decisiones de arquitectura, por si las retomás después):**

- **Audio**: no hay archivos MP3 todavía — se usa la síntesis de voz del
  navegador a través de una abstracción `AudioProvider`
  (`src/lib/audio/audioProvider.ts`). El resto del módulo habla contra esa
  interfaz, no contra `speechSynthesis` directamente, así que cambiar a
  audio real pregrabado o un proveedor de TTS en la nube el día de mañana
  es reemplazar esa una clase, no tocar Listening entero.
- **Conversation Listening SÍ usa IA** (Gemini) para evaluar la
  comprensión — es semántica, no busca coincidencia de palabras: podés
  responder en español y si el significado es correcto, puntúa bien.
- **Dictation NO usa IA para nada** — la comparación palabra por palabra
  (`src/lib/listening/dictationDiff.ts`) es un alineamiento tipo
  Levenshtein hecho a mano, con heurísticas para distinguir 10 tipos de
  error (`SPELLING_ERROR` vs `MISHEARD_SOUND`, contracciones no
  reconocidas, artículos, preposiciones, etc.). Es determinístico, gratis,
  y honestamente aproximado — no es un analizador lingüístico real, así
  que puede clasificar mal algún caso raro. Está documentado en el propio
  archivo.
- **Detección de contracciones/reductions** en el audio
  (`src/lib/listening/patterns.ts`) tampoco usa IA — es una búsqueda de
  texto contra una lista conocida. Alimenta las "Listening Notes" después
  de revelar la transcripción.
- **Error Profile**: los errores de listening se guardan con
  `category = 'listening'` y el patrón específico en texto (ej.
  `"MISHEARD_CONTRACTION:I've"` en dictation, donde sabemos exactamente
  qué palabra falló; o `"contraction:I'll"` en conversation, donde es una
  suposición razonable sobre qué probablemente dificultó una comprensión
  floja — no una certeza, ver comentarios en el código).
- **Selección adaptativa** (`/api/listening/next`): sin IA, prioriza
  ejercicios cuyos `target_patterns` coinciden con tus errores de listening
  más frecuentes, sin repetir siempre lo mismo (mezcla con algo de
  variedad, como pide la sección 17 del prompt del módulo).
- **Daily Challenge**: ahora tiene 6 bloques posibles en vez de 4
  (`Listening Conversation` y `Dictation` se suman a Vocabulary,
  Connectors, Pronunciation y AI Conversation) — mismo motor de antes, sin
  reescribir nada.
- **Dashboard**: el skill genérico "Listening" ya no aparece vacío — se
  calcula como el promedio de comprehension (conversation) y accuracy
  (dictation). Además hay una tarjeta específica con Comprehension y
  Dictation por separado, tal como pedía la sección 25 del prompt del
  módulo.

## Describe the Image (añadido)

`/dashboard/describe-image` — mirás una imagen (una de 3, elegida al azar)
y escribís una descripción en inglés; la IA la evalúa con una sola llamada
(content, grammar, vocabulary, coherence, connectors, naturalness), te
muestra una versión mejorada basada en TU propio texto, y podés volver a
intentarlo con la misma imagen para ver si mejoraste.

**Para activarlo:** aplica `supabase/migrations/0009_describe_image.sql`
(crea 2 tablas nuevas — no había ninguna equivalente — y carga las 3
imágenes).

**Cómo funciona:**

- Las 3 imágenes son ilustraciones simples generadas UNA vez (no fotos
  reales, no se genera nada con IA en cada uso) y viven en
  `public/images/describe/`. Son pictogramas planos, no fotografías —
  suficientes para describir personas, objetos y acciones, pero no esperes
  fotorrealismo.
- Una sola llamada a Gemini por intento (sección 29 del prompt del
  módulo): la imagen real se manda al modelo (multimodal), junto con un
  "grounding" oculto de qué hay realmente en la escena — ayuda a que la
  evaluación sea consistente dado que es una ilustración simple, pero la
  IA sigue mirando la imagen de verdad, no solo el texto de grounding.
- La "improved version" reescribe TU texto, no genera una descripción
  nueva — conserva tus ideas.
- El XP es decreciente por intento del mismo ejercicio (20 → 10 → 5 → 2)
  para que "Try again" siga sirviendo para aprender sin poder farmear XP
  infinito repitiendo.
- Reutiliza `error_profile` con las categorías `grammar`/`vocabulary`/
  `connectors` que ya existían — no se agregó ninguna categoría nueva.
- Se suma un skill nuevo "Writing" al dashboard (promedio de
  content/coherence/naturalness/connectors) — no toca los skills
  `grammar`/`vocabulary`/`connectors` existentes, que siguen viniendo solo
  de las conversaciones, para no mezclar dos escalas distintas en un
  mismo número.
- No se integró al Daily Challenge ni se tocó ningún archivo fuera de lo
  estrictamente necesario, tal como pedía este prompt específicamente.

## Error Profile — pantalla visible (añadido)

`/dashboard/error-profile` — muestra tus patrones de error agrupados por
área (Connectors, Pronunciation, Listening, Grammar, Vocabulary, Fluency),
con frecuencia y una tendencia estimada.

**Para activarlo:** no necesita ninguna migración nueva — solo lee la
tabla `error_profile`, que ya venía llenándose desde Pronunciation Lab,
Listening, Connector Challenge, Conversación y Describe the Image.

**Cómo funciona:**

- La "tendencia" (mejorando/estable/activo) es una estimación simple a
  partir de la frecuencia y cuándo fue la última vez que apareció el
  error — no hay un historial completo guardado, así que es una
  aproximación honesta, no una medición exacta (mismo criterio que el
  resto de la app: mejor estimar con cuidado que inventar precisión).
- Cada categoría linkea directo al módulo donde se puede practicar eso.
- Sin datos todavía, muestra un estado vacío en vez de tablas vacías.

## Weekly Goals (añadido)

Barra "WEEKLY GOAL" en el dashboard — meta de días activos por semana
(por defecto, 5 de 7 días con algo de práctica real, cualquier módulo
cuenta).

**Para activarlo:** aplica `supabase/migrations/0011_weekly_goals.sql`
(agrega una columna `metric` a la tabla `goals`, que ya existía desde
`0002` — no crea ninguna tabla nueva).

**Cómo funciona:**

- La semana va de lunes a domingo (UTC). Al abrir el dashboard, si no
  existe todavía una meta para la semana actual, se crea sola.
- "Día activo" cuenta cualquier práctica real en cualquier módulo —
  vocabulario, conectores, pronunciación, conversación, listening o
  Describe the Image — no hace falta completar algo específico.
- Cuando cambia de semana, la meta anterior se cierra sola como
  `completed` o `failed` según si se llegó al objetivo — no queda
  eternamente "activa" en la base.
- Por ahora el objetivo (5 días) es fijo — no hay todavía una pantalla
  para cambiarlo. La tabla `goals` ya soporta metas `custom` además de
  `weekly`, así que agregar eso más adelante no requiere tocar el
  esquema.

## Achievements (añadido)

`/dashboard/achievements` — 18 logros (la tabla `achievements` ya existía
desde el principio, vacía; esta vez se pobló y se conectó de verdad).

**Para activarlo:** aplica `supabase/migrations/0012_achievements.sql`
(solo puebla `achievements` — no crea tablas nuevas).

**Cómo funciona:**

- Se revisan y otorgan al abrir el dashboard (`checkAndUnlockAchievements`
  en `src/lib/achievements.ts`) — a propósito, NO se tocó ninguna de las
  ~10 rutas de acción existentes (vocabulario, conectores, pronunciación,
  conversación, listening, describe image...) para evitar un cambio
  invasivo repetido en cada una. El costo: un logro se nota recién la
  próxima vez que entrás al dashboard, no en el instante exacto en que lo
  cumplís — un trade-off razonable dado lo demás.
- Cuando se desbloquea uno nuevo, aparece un banner arriba del todo en el
  dashboard la primera vez que se nota.
- Cubre hitos de cada módulo (primera vez usando cada uno), volumen
  (25 palabras, 10 conectores activos, 10 ejercicios de listening, 10
  conversaciones), precisión (dictado perfecto), constancia (streak de 7
  y 30 días, cumplir una meta semanal) y progreso general (nivel 5,
  completar un Daily Challenge entero).

## Voz natural (añadido)

Dos mejoras separadas para que la app suene menos robótica.

### 1. Mejor selección de voz del navegador (gratis, ya activo)

El código nunca elegía una voz explícitamente — se quedaba con la que el
navegador usara por default para inglés, que suele ser la más robótica.
Ahora `src/lib/audio/selectVoice.ts` busca la mejor voz disponible
(prioriza voces "Natural"/"Neural"/"Enhanced"/Google) y a cada hablante de
una conversación de Listening le asigna una voz distinta de verdad, en vez
de simular una segunda voz cambiando el pitch. Se aplica en Listening,
Conversación con IA y Pronunciation Lab. Sin costo, sin dependencias
nuevas — Edge (voces "Online Natural" de Microsoft) es el navegador donde
más se nota.

### 2. Audio real pre-generado con Gemini TTS (opcional, tiene costo mínimo)

Para el contenido FIJO (vocabulario y ejercicios de Listening), podés
generar audio real una sola vez y que quede gratis para siempre después —
misma filosofía que las imágenes de Describe the Image.

**Cómo usarlo:**

```bash
npm run generate-audio              # genera lo que falte
npm run generate-audio -- --limit=3 # probar con solo 3 llamadas primero
npm run generate-audio -- --force   # regenerar todo
npm run generate-audio -- --only=vocabulary   # solo vocabulario
npm run generate-audio -- --only=listening    # solo listening
```

Guarda los `.wav` en `public/audio/vocabulary/` y `public/audio/listening/`,
y actualiza `audio_url` en Supabase (esa columna ya existía desde el
principio en ambas tablas, sin usar). La app prioriza automáticamente el
audio real cuando existe (`AudioControls`, `VocabularyCard`,
`PronunciationRecorder`) y cae a la voz del navegador si no lo generaste
todavía — no rompe nada si no corrés el script.

Las conversaciones de Listening usan `multiSpeakerVoiceConfig` de Gemini
(dos voces reales conversando en el mismo archivo, no dos clips pegados) —
mucho más natural para los diálogos A/B.

**Lo que NO se pre-genera:** las respuestas de la IA en Conversación —
son dinámicas (cambian cada vez), así que pre-generarlas no tiene sentido.
Esas siguen usando la mejora #1 (voz del navegador). Convertirlas a Gemini
TTS en vivo es posible pero le agrega costo real a cada mensaje — avisame
si lo querés y lo armamos aparte.

## Settings (añadido)

`/dashboard/settings` — nombre, nivel (A1-C2), variante de inglés
(British/American) y minutos diarios objetivo. También agrega **cerrar
sesión**, que no existía en ningún lado de la app hasta ahora.

**Para activarlo:** no necesita ninguna migración — las 4 columnas
(`display_name`, `overall_level`, `target_variant`,
`daily_minutes_goal`) ya existían en `profiles` desde el principio
(`0001_init.sql`), simplemente no había ninguna pantalla para editarlas.

**Cómo funciona:**

- El nivel (`overall_level`) ya se usaba para elegir la dificultad de los
  ejercicios de Listening (`/api/listening/next`) — antes solo se podía
  cambiar directo en la base de datos.
- Los minutos diarios objetivo ahora sí se conectan al motor del Daily
  Challenge: antes la sesión siempre rotaba entre 30/35/40/45 fijo, sin
  importar lo que dijera el perfil. Ahora rota alrededor del número que
  pongas (ej. si ponés 20, rota entre 15/20/25/30).

## Onboarding (añadido)

`/onboarding` — pantalla de configuración inicial: nombre, nivel
autopercibido, variante de inglés y minutos diarios. Aparece sola la
primera vez que un usuario entra al dashboard, antes de ver nada más.

**Para activarlo:** aplica `supabase/migrations/0014_onboarding.sql`
(agrega `onboarding_completed` a `profiles`, que ya existía — no crea
tablas nuevas).

**Importante — afecta tu cuenta actual también:** como la columna nueva
arranca en `false` por default, la PRÓXIMA VEZ que entres al dashboard
con tu usuario actual también vas a ver el onboarding una vez (aunque ya
vengas usando la app). Es esperable, no un bug — completalo (podés dejar
los mismos valores que ya tenías) y no lo vas a volver a ver.

**Cómo funciona:**

- Reutiliza la misma ruta que ya guardaba Settings
  (`/api/settings/update`) en vez de crear una nueva — solo le agrega un
  campo `onboarding_completed` opcional.
- El redirect se resuelve en `/dashboard/page.tsx` (server-side, antes de
  renderizar nada) — no hay parpadeo ni pantalla del dashboard a medio
  cargar antes de mandarte al onboarding.
- Quedó fuera de alcance a propósito: el resto de las páginas del
  dashboard (ej. entrar directo a `/dashboard/vocabulary` por URL) no
  revisan este flag todavía — alguien que escriba la URL directamente
  podría saltarse el onboarding. Para una app de un solo usuario no es un
  problema real; si community pasa a multiusuario, valdría la pena mover
  este chequeo a un layout compartido.

## Consumo de IA (añadido)

`/dashboard/ai-usage` — cuánto gastaste hoy, este mes y en total, más el
desglose por módulo.

**Para activarlo:** no necesita ninguna migración — lee `ai_usage_events`,
que ya se venía llenando desde el principio (todas las rutas con IA ya
registraban modelo y tokens), solo que nunca había una pantalla para
verlo.

**Cómo funciona:**

- El costo en dólares **se calcula al leer**, no estaba guardado —
  `ai_usage_events` solo tenía tokens. `src/lib/aiUsage.ts` aplica
  precios actuales de Gemini ($0.25/$1.50 por 1M tokens para
  texto, $1.00/$20.00 para TTS) sobre los tokens ya registrados. Es una
  **estimación**, no una factura exacta — Google cambia precios con el
  tiempo — mismo criterio de honestidad que el resto de la app.
- Usa el cliente de service role para leer `ai_usage_events` (esa tabla
  nunca tuvo policies de RLS para usuarios, a propósito, desde que se
  creó) — pero filtrando siempre por tu propio `user_id` en el servidor,
  nunca expuesto al cliente.
- Deja explícito qué módulos SÍ usan IA (Connector Challenge,
  Conversación, Pronunciation Lab, Describe the Image, y solo 3 de los 6
  ejercicios de Listening) y cuáles son 100% gratis (Vocabulary,
  Dictation, Fill the Gaps, Complete the Sentence) — para que quede claro
  dónde se genera costo y dónde no.

## Límites de costo de IA (añadido)

Desde Settings podés poner un límite diario y/o mensual (en USD) — si lo
alcanzás, los módulos que usan IA se bloquean con un mensaje claro hasta
que lo subas o pase el período.

**Para activarlo:** aplica `supabase/migrations/0015_ai_limits.sql`
(2 columnas nuevas en `profiles` — no crea tablas nuevas).

**Cómo funciona:**

- Por default no hay límite (`null` en ambas columnas) — es opt-in, no
  te vas a encontrar bloqueado sin haberlo configurado vos mismo.
- Un solo guard compartido (`src/lib/aiLimit.ts`) se agregó al principio
  de las 7 rutas que gastan IA (Connector Challenge, Conversación ×3,
  Pronunciation Lab, Listening Retell, Describe the Image) — calcula tu
  gasto de hoy/este mes (mismo cálculo que la pantalla de Consumo de IA)
  y corta ANTES de llamar a Gemini si ya te pasaste, así no se gasta ni
  un token de más.
- Ojo con un detalle: en "terminar conversación", el límite se chequea
  recién si la conversación tuvo al menos una respuesta tuya — si fue tan
  corta que de todos modos no iba a generar el reporte con IA, no te deja
  bloqueado por algo que no iba a costar nada.
- De paso, aproveché para agregarles manejo de errores a 5 pantallas que
  no lo tenían (Connector Challenge, Conversación, Pronunciation Lab,
  Listening Retell, elegir escenario de conversación) — antes, si algo
  fallaba en el servidor, se quedaban "cargando" sin ningún mensaje. Ahora
  muestran el motivo (incluido, pero no solo, cuando te topás con el
  límite).

## Qué queda pendiente del plan original

Con esto, todos los módulos principales del prompt maestro (incluido
Listening) están funcionando. Lo que falta si quieres seguir ampliando:
**Error Profile** como pantalla visible para el usuario (ya se guarda en
la tabla, pero no hay una vista que lo muestre), **Achievements/
gamificación** más allá de XP y streak (la tabla existe, y Listening ya
deja preparados los eventos — `FIRST_LISTENING`, `PERFECT_DICTATION`, etc.
se pueden derivar de `user_listening_attempts` cuando se implemente el
sistema — pero todavía no se otorgan), audio real (MP3 grabado o un
proveedor de TTS en la nube, en vez de la síntesis del navegador), y
preparar la arquitectura multiusuario real (autenticación ya lista vía
Supabase, pero faltarían planes de suscripción, límites de uso, etc. —
sección 25 del prompt maestro original).
