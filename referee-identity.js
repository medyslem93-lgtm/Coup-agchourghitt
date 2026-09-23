(() => {
  'use strict';
  const groups = [
    ['20608eb6-a63d-44dc-8572-132a9e5c19cb','def3e3fe-e34f-41aa-999a-fb489e44735e'],
    ['f2fc2649-0d29-4715-bc5d-d578a4b9cc22','0e6041d0-2b25-4a03-9788-e781e217a920'],
    ['369a4731-43b4-4c6b-aefc-881920eeec45','412d5ece-0725-421b-90e3-61a2ab0fe884'],
    ['3a020580-e51a-4631-9c62-2891b21e19cc','c72760b0-73a5-4043-bd9d-b8dcd4317da4'],
    ['33f3ad8b-d861-407c-b72a-7bc920f4b4fd','4e7d0790-066e-4e1c-8d4f-28c9950067a0'],
    ['d5f7b144-c78d-4adf-9731-a3a1420f69f2','a88ff2e2-9310-4291-addd-6b5e2d91519b'],
    ['a00269f6-bac0-407a-ac05-9ea3f1cdfe22','5706ebe9-77f6-4be4-a4e8-95fa89f55ebe']
  ];
  const alias = new Map(groups.flatMap(([primary,...others]) => others.map(id => [id,primary])));
  const canonical = id => alias.get(id) || id;
  function merge(refs, assign, stats = []) {
    const byId = new Map(refs.map(ref => [ref.id, {...ref}]));
    for (const [primary,...others] of groups) {
      const first = byId.get(primary); if (!first) continue;
      for (const id of others) {
        const other = byId.get(id); if (!other) continue;
        if (!first.photo_url && other.photo_url) first.photo_url = other.photo_url;
        byId.delete(id);
      }
    }
    const seen = new Set();
    const assignments = assign.map(row => ({...row,referee_id:canonical(row.referee_id)})).filter(row => {
      const key = `${row.referee_id}:${row.match_id || row.id}:${row.role || ''}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const statistics = stats.map(row => ({...row,referee_id:canonical(row.referee_id)}));
    return {refs:[...byId.values()],assign:assignments,stats:statistics,canonical};
  }
  window.AGCH_REFEREE_IDENTITY = {merge,canonical};
})();
