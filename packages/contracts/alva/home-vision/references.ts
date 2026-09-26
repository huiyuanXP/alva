import type {Answers, Value} from './flow.js';

/** Keep an annotation attached to its reference when an earlier upload is removed. */
export function updateReferences(answers: Answers, next: Value): Answers {
  const previous = answers.Q09a?.value;
  const annotations = answers.Q09b;
  if (!Array.isArray(previous) || !Array.isArray(next) ||
      !annotations?.value || typeof annotations.value !== 'object' || Array.isArray(annotations.value)) {
    return answers;
  }
  const unused = new Set(previous.map((_, index) => index));
  const remapped: Record<string, Value> = {};
  next.forEach((reference, newIndex) => {
    const oldIndex = [...unused].find(index => JSON.stringify(previous[index]) === JSON.stringify(reference));
    if (oldIndex === undefined) return;
    unused.delete(oldIndex);
    for (const [key, value] of Object.entries(annotations.value as Record<string, Value>)) {
      const match = key.match(/^(\d+)-(\d+)$/);
      if (match && Number(match[1]) === oldIndex) remapped[`${newIndex}-${match[2]}`] = value;
    }
  });
  return {...answers, Q09b: {...annotations, value: remapped}};
}
