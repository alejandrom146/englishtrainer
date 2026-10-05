# Modelo conceptual de base de datos — English Personal Trainer

## Decisiones de diseño (antes del SQL)

**Conectores como tipo de expresión, no tabla aparte.** El prompt original
pedía `expressions/user_expressions` y `connectors/user_connectors` como
entidades separadas. Estructuralmente son lo mismo (texto + significado +
estado de aprendizaje por usuario con repetición espaciada), así que los
uno en `expressions` con `type = 'connector'`. El Connector Challenge sigue
siendo un módulo con su propia lógica y pantalla — simplemente consulta
`expressions where type = 'connector'` en vez de tener su propia tabla
duplicada. Esto evita mantener dos sistemas de repetición espaciada
idénticos.

**Repetición espaciada tipo SM-2 simplificado.** Tanto `user_vocabulary`
como `user_expressions` guardan `ease_factor`, `interval_days`,
`repetitions` y `due_at`. Es el algoritmo estándar (usado por Anki, etc.):
barato de calcular, no necesita IA, y decide cuándo debe volver a aparecer
cada palabra o expresión sin fijar "mañana" a ciegas.

**Contenido global vs. progreso por usuario.** `vocabulary`, `expressions`,
`conversation_scenarios` y `listening_exercises` son catálogos compartidos
(no se duplican por usuario). El progreso individual vive en
`user_vocabulary`, `user_expressions`, etc. Así, cuando la app sea
multiusuario, el catálogo no se multiplica — todos comparten el mismo banco
de contenido, cada uno con su propio estado de aprendizaje.

**El "error profile" es agregado, no un log crudo.** En vez de guardar cada
error individual, `error_profile` guarda patrones (categoría + descripción
+ frecuencia + tendencia). Los errores puntuales sí quedan en
`conversation_feedback` (jsonb); `error_profile` es la vista resumida y
persistente que la IA actualiza tras cada conversación.

**Puntuaciones por habilidad en una sola tabla, no una columna por skill.**
`skill_scores` tiene una fila por (usuario, habilidad), no una tabla con una
columna por cada una. Añadir una habilidad nueva en el futuro es una fila,
no una migración.

## Entidades y relaciones

```
auth.users (Supabase)
   └── profiles (1:1)
   └── skill_scores (1:N — una fila por habilidad)
   └── user_vocabulary (1:N) ──> vocabulary (catálogo global)
   └── user_expressions (1:N) ──> expressions (catálogo global, incl. conectores)
   └── conversations (1:N) ──> conversation_scenarios (catálogo, opcional)
         └── conversation_messages (1:N)
         └── conversation_feedback (1:1, al finalizar)
   └── pronunciation_attempts (1:N, puede referenciar vocabulary/expression/conversation)
   └── user_listening_attempts (1:N) ──> listening_exercises (catálogo global)
   └── daily_challenges (1:N, una por día)
         └── daily_progress (1:N — un bloque completado del reto)
   └── learning_sessions (1:N — sesión de estudio real, puede ligarse a un daily_challenge)
   └── goals (1:N)
   └── user_achievements (1:N) ──> achievements (catálogo global)
   └── xp_events (1:N — cada evento que otorga XP)
   └── error_profile (1:N — un patrón detectado por categoría)
   └── ai_usage_events (1:N — control de costo, no visible al usuario)
```

## Qué se implementa ahora y qué no

Se crean todas las tablas de este documento (con RLS) porque el esquema
completo era el objetivo de este paso — pero **vacías**: sin datos semilla
de vocabulario/expresiones/escenarios todavía. Eso es contenido, no
esquema, y se genera en el módulo de vocabulario / conversación.
