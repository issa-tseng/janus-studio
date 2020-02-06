
const blank = (x => (x === '') || (x == null));
const nonblank = (x => !blank(x));
const exists = (x => x != null);
const ifexists = (f => (...xs) => (xs[0] == null) ? undefined : f(...xs));

const give = x => _ => x;

const first = l => l ? l[0] : undefined;
const last = l => l ? l[l.length - 1] : undefined;

module.exports = {
  blank, nonblank, exists, ifexists,
  give,
  first, last
};

