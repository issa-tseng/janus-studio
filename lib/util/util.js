
const blank = (x => (x === '') || (x == null));
const nonblank = (x => !blank(x));
const exists = (x => x != null);
const ifexists = (f => (...xs) => (xs[0] == null) ? undefined : f(...xs));

const primitive = (x => {
  const type = typeof x;
  return (type === 'string') || (type === 'number') || (type === 'boolean');
});

const noop = _ => {};
const identity = x => x;
const give = x => _ => x;

const first = l => l ? l[0] : undefined;
const last = l => l ? l[l.length - 1] : undefined;

const pop = (m, k) => _ => {
  m.set(k, true);
  setTimeout(_ => { m.set(k, false); }, 0);
};

module.exports = {
  blank, nonblank, exists, ifexists,
  primitive,
  identity, give,
  first, last,
  pop
};

