
const blank = (x => (x === '') || (x == null));
const nonblank = (x => !blank(x));
const exists = (x => x != null);
const ifExists = (f => x => (x == null) ? x : f(x));

const give = x => _ => x;

module.exports = {
  blank, nonblank, exists, ifExists,
  give
};

