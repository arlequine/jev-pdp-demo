// Criterios de éxito escritos antes de correr nada (tickets/<id>.truth.json).
export type Outcome = { order: string[]; excluded: string[] };
export type CriterionResult = { id: string; description: string; passed: boolean };

export function evaluate(truth: any, o: Outcome): CriterionResult[] {
  if (!truth) return [];
  const pos = (id: string) => {
    const i = o.order.indexOf(id);
    return i === -1 ? Infinity : i + 1;
  };
  return truth.criteria.map((c: any) => {
    let passed = false;
    if (c.top3) passed = c.top3.every((id: string) => pos(id) <= 3);
    else if (c.inTop) passed = pos(c.inTop.id) <= c.inTop.n;
    else if (c.minPosition) passed = pos(c.minPosition.id) >= c.minPosition.position && !o.excluded.includes(c.minPosition.id);
    else if (c.notInTop) passed = pos(c.notInTop.id) > c.notInTop.n;
    else if (c.excluded) passed = o.excluded.includes(c.excluded);
    return { id: c.id, description: c.description, passed };
  });
}
