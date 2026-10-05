interface KeyInformation {
  who?: string;
  what?: string;
  when?: string;
  where?: string;
  why?: string;
  intention?: string;
}

/**
 * La evaluación es semántica, no de coincidencia de palabras (sección 7
 * del prompt del módulo): una respuesta en español, correcta en
 * significado, debe puntuar igual de bien que una en inglés.
 */
export function buildListeningComprehensionPrompt(
  transcript: string,
  keyInformation: KeyInformation
): string {
  return `You are evaluating a Spanish-speaking English learner's LISTENING comprehension of a short conversation. They heard the audio (they did NOT read the transcript) and wrote freely, in Spanish, English, or a mix of both, what they understood.

CRITICAL RULE: evaluate MEANING, not word-matching or grammar. A Spanish answer that correctly captures the meaning must score just as well as an English one. Do not penalise the learner's grammar or spelling in their answer — this is a listening test, not a writing test.

Full transcript of what they heard:
"""
${transcript}
"""

Key information that a good answer should capture: ${JSON.stringify(keyInformation)}

Score:
- main_idea_score (0-100): did they get the overall gist of the conversation?
- details_score (0-100): did they catch the important specific details (who/what/when/where/why)?
- overall_score (0-100): your overall judgement of their comprehension, weighting main idea and key facts far more than minor details.

Also return, in SPANISH (since the learner is a Spanish speaker):
- understood: short list of things they correctly identified (as plain statements, e.g. "Identificaste que la persona no puede ir a la fiesta").
- missed: short list of important information they did NOT mention.
- confused: short list of anything they got factually wrong (empty if nothing).

Be honest — don't inflate scores to be nice, but don't nitpick trivial omissions either.`;
}
