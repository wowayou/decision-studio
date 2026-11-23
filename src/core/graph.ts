// Compile the domain dependency table once. All projections share its edges.
export function compileGraph<K extends string>(inputs: Record<K, readonly K[]>) {
  const order: K[] = [];
  const active = new Set<K>();
  const visited = new Set<K>();
  function visit(key: K) {
    if (active.has(key)) throw new Error(`依赖成环 ${key}`);
    if (visited.has(key)) return;
    if (!Object.hasOwn(inputs, key)) throw new Error(`依赖节点不存在 ${key}`);
    active.add(key);
    inputs[key].forEach(visit);
    active.delete(key);
    visited.add(key);
    order.push(key);
  }
  (Object.keys(inputs) as K[]).forEach(visit);
  function downstream(start: K): K[] {
    const affected = new Set([start]);
    for (const key of order) if (inputs[key].some(input => affected.has(input))) affected.add(key);
    return order.filter(key => affected.has(key));
  }
  return { inputs, order, downstream };
}
