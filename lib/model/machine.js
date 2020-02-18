const janus = require('janus');
const uuid = require('uuid/v4');
const { Varying, Map, Model, attribute, initial, transient, bind, from, List, match } = janus;
const { reference } = require('janus-inspect').types;
const { Env, compile, success, fail } = require('../exec/eval');
const { atomize, returnify } = require('../exec/code');
const { inspect } = require('../util/inspect');
const { blank, nonblank, ifexists } = require('../util/util');
const { Flyout } = require('./chrome');

const { DomViewInspector } = require('janus-inspect').inspector.domview;


class IdAttribute extends attribute.Text {
  get writeInitial() { return true; }
  initial() { return uuid(); }
}


////////////////////////////////////////////////////////////////////////////////
// statements

class Statement extends Model.build(
  transient('result'),
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('code', attribute.Text)
) {
  get isStatement() { return true; }
}
const Statements = List.of(Statement);


////////////////////////////////////////////////////////////////////////////////
// stacks and blocks

// at each navigation step, we /always/ return a Varying.
const navigate = (m, x) => Array.isArray(x) ? x.reduce(_navigate, m) : _navigate(m, x);
const _navigate = ifexists((m, x) => match(
  reference.get(k => m.get(k)),
  reference.parent(_ => new Varying(m._parent)),
  reference.attr(k => new Varying(m.attribute(k))),

  reference.attrModel(_ => new Varying(m.model)),
  reference.attrValue(_ => m.getValue()),
  reference.attrEnumValues(_ => m.values()),

  reference.viewSubject(_ => new Varying(m.subject)),
  reference.viewVm(_ => new Varying(m.vm)),
  reference.mutator((criteria) => {
    const binding = m._bindings[DomViewInspector.indexFor(criteria, m)];
    return new Varying((binding == null) ? null : binding.parent);
  })
)(x));
class Block extends Model.build(
  attribute('type', class extends attribute.Enum {
    _values() { return [ 'reference', 'action' ] }
  })
) {
  get isBlock() { return true; }

  resolve(assembly) {
    const to = this.get_('to'); // TODO: i think this is immutable?
    const statement = (typeof to === 'string') ? assembly.getStatement(to) : to;
    return Varying.all([ statement.get('result'), this.get('links') ])
      .flatMap(ifexists((c, links) => c.mapSuccess(x =>
        links
          ? links.flatFoldl(x, navigate).map(y => inspect(y, this))
          : inspect(x, this)
      ).get()));
  }
}
const Blocks = List.of(Block);


class Stack extends Model.build(
  attribute('name', attribute.Text),
  attribute('wider', attribute.Boolean),
  attribute('blocks', attribute.List.of(Blocks))
) {}
const Stacks = List.of(Stack);


////////////////////////////////////////////////////////////////////////////////
// assemblies

class Assembly extends Model.build(
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('statements', attribute.List.of(Statements)),
  attribute('stacks', attribute.List.of(Stacks)),
  bind('bindings', from('result').map(x => success.match(x, (y => new Env(y))))),

  attribute('flyouts', class extends attribute.List.withInitial() {
    get transient() { return true; }
  }),
  attribute('console-output', class extends attribute.List.withInitial() {
    get transient() { return true; }
  }),
  attribute('console-input', class extends attribute.Text {
    get transient() { return true; }
  })
) {
  _initialize() {
    // any time the repl is empty, create a statement.
    const statements = this.get_('statements');
    statements.length.react((l) => { if (l === 0) this.createStatement(); });

    // any time the very last statement is finalized, make a new one following.
    this.reactTo(this.get('statements').flatMap(ifexists(statements =>
      statements.at(-1).flatMap(ifexists((s) => s.get('result'))))),
      result => { if (result != null) this.createStatement(); });
  }

  createStatement(idx) {
    const statement = new Statement();
    this.get_('statements').add(statement, idx);
    return statement;
  }

  clear() { this.get_('statements').removeAll(); }

  // since ids are immutable, we just return this statically.
  getStatement(id) {
    for (const statement of this.get_('statements'))
      if (statement.get_('id') === id) return statement;
  }

  // attempt to commit the given statement. checks syntax, breaks the code into
  // individual statements if necessary, and attempts to rerun the whole assembly.
  commit(statement) {
    // parse and atomize. bail if we can't run the thing.
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
      // we have additional statements that have been split off. add them following
      // this one, and assign the name/code bindings appropriately as we do so.
      for (const [ left, right ] of atomized) {
        const name = (left == null) ? null : code.substring(left.start, left.end);
        additional.push(new Statement({ name, code: code.substring(right.start, right.end) }));
      }
      const statements = this.get_('statements');
      statements.add(additional, statements.list.indexOf(statement) + 1);
    }

    this.run();
    return true; // code commit successful.
  }

  // executes this assembly.
  run() {
    const context = this.get_('project').get_('context');

    // start by resetting our requires.
    for (const reset of context.get_('reset'))
      delete require.cache[require.resolve(reset)];

    // then compile and execute our root environment code.
    let bindings = compile({}, context.get_('env')).flatMap(f => f());
    bindings = bindings.flatMap(scope => success(Object.assign({}, janus, scope)));

    // and then run through each statement and execute. carry forward our bindings.
    //const pairs = this.get_('base').map(x => [ x ]);
    //const statements = []; // TODO: incorporate base again
    //statements.push(...this.get_('statements').list.map(a => [ a.get_('statement'), a ]));
    for (const statement of this.get_('statements')) {
      const code = statement.get_('code');
      if (blank(code)) continue;

      bindings = bindings.flatMap(scope => {
        const proc = compile(new Env(scope), `return ${code}`);
        const result = proc.flatMap(f => f());
        if (statement != null) statement.set('result', result);

        const name = statement.get_('name');
        if (nonblank(name)) success.match(result, (x => { scope[name] = x; }));

        return success(scope);
      });
    }

    // and now store our final bindings.
    this.set('result', bindings);
  }

  // runs an action statement in context of the current assembly result.
  // returns the result.
  exec(code) {
    const result = this.get_('result');
    if (!success.match(result)) return fail();
    const bindings = result.get();

    const returnified = returnify(code);
    if (returnified === false) return fail('syntax error'); // TODO: better.

    return compile(new Env(bindings), returnified).flatMap(f => f());
  }

  execConsole() {
    const code = this.get_('console-input');
    const result = this.exec(code);
    const succeeded = success.match(result);

    if (succeeded) {
      this.get_('console-output').add(new Block({ type: 'action', code, result }));
      this.set('console-input', '');
    }

    return succeeded;
  }

  ////////////////////////////////////////
  // services

  flyout(trigger, subject) {
    const flyouts = this.get_('flyouts');
    const trigger_ = trigger[0];
    for (const flyout of flyouts)
      if (flyout.get_('trigger_') === trigger_)
        return; // don't allow multiple flyouts from the same source.
    flyouts.add(new Flyout({ trigger, trigger_, subject }));
  }
}
const Assemblies = List.of(Assembly);


module.exports = {
  Statement, Statements,
  Block, Blocks, Stack, Stacks,
  Assembly, Assemblies
};

