
const blank = (x => (x === '') || (x == null));
const nonblank = (x => !blank(x));
const exists = (x => x != null);
const ifexists = (f => (...xs) => (xs[0] == null) ? undefined : f(...xs));

const give = x => _ => x;

module.exports = {
  blank, nonblank, exists, ifexists,
  give
};

