const { Map, Model, attribute, initial, transient, bind, from, List } = require('janus');
const { Statement } = require('../model');
const { Env, compile, success, fail } = require('./eval');
const { atomize } = require('./code');
const { blank, nonblank, ifExists } = require('../util/util');


// viewmodel companion to Statement
class Atom extends Model.build(
  bind('named', from('statement').get('name').map(nonblank))
) {
  commit() {
    // parse and atomize. bail if we can't run the thing.
    const statement = this.get_('statement');
    const code = statement.get_('code');
    const atomized = atomize(code);
    if (atomized === false) return false;

    const own = atomized.shift();
    if (own[0] != null) {
      // our own statement has an assignment. regardless what we had already for
      // our name binding, clobber it with what's now been provided.
      const [ left, right ] = own;
      statement.set('name', code.substring(left.start, left.end));
      statement.set('code', code.substring(right.start, right.end));
    }

    const additional = [];
    if (atomized.length > 0) {
      const statements = this.get_('polymer').get_('statements');
      // we have additional statements that have been split off. add them following
      // this one, and assign the name/code bindings appropriately as we do so.
      for (const [ left, right ] of atomized) {
        const name = (left == null) ? null : code.substring(left.start, left.end);
        additional.push(new Statement({ name, code: code.substring(right.start, right.end) }));
      }
      statements.add(additional, statements.list.indexOf(statement) + 1);
    }

    // now, run our own code:
    this.get_('polymer').run();

    return true; // regardless of runtime errors, we at least tried to run. return true.
  }
}


// viewmodel companion to Assembly
class Polymer extends Model.build(
  bind('statements', from('assembly').get('statements')),
  bind('atoms', from.self().and('statements').all.map((polymer, statements) =>
    statements.map(statement => new Atom({ polymer, statement }))))
) {
  _initialize() {
    // determine our base statements, and save them.
    const project = this.get_('project');
    const base = [];
    let ptr = this.get_('assembly');
    while ((ptr = project.getAssembly(ptr.get_('base'))) != null)
      base.push(...ptr.get_('statements').list);
    this.set('base', base);

    // any time the repl is empty, create a statement.
    const statements = this.get_('assembly').get_('statements');
    statements.length.react((l) => { if (l === 0) this.createStatement(); });

    // any time the very last statement is finalized, make a new one following.
    this.reactTo(this.get('atoms').flatMap(ifExists(atoms =>
      atoms.at(-1).flatMap(ifExists((s) => s.get('result'))))),
      (result) => { if (result != null) this.createStatement(); });
  }

  createStatement(idx) {
    const statements = this.get_('statements');
    const statement = new Statement();
    statements.add(new Statement(), idx);
    return statement;
  }

  clear() { this.get_('statements').removeAll(); }

  run() {
    const context = this.get_('project').get_('context');

    // start by resetting our requires.
    for (const reset of context.get_('reset'))
      delete require.cache[require.resolve(reset)];

    // then compile and execute our root environment code.
    let bindings = compile({}, context.get_('env')).flatMap(f => f());

    // and then run through each statement and execute. carry forward our bindings.
    const pairs = this.get_('base').map(x => [ x ]);
    pairs.push(...this.get_('atoms').list.map(a => [ a.get_('statement'), a ]));
    for (const [ statement, atom ] of pairs) {
      const code = statement.get_('code');
      if (blank(code)) continue;

      bindings = bindings.flatMap(scope => {
        const proc = compile(new Env(scope), `return ${code}`);
        const result = proc.flatMap(f => f());
        if (atom != null) atom.set('result', result);

        const name = statement.get_('name');
        if (nonblank(name)) success.match(result, (x => { scope[name] = x; }));

        return success(scope);
      });
    }

    // and now store our final bindings.
    this.set('bindings', bindings);
  }
}


module.exports = { Atom, Polymer };

