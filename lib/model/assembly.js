const janus = require('janus');
const uuid = require('uuid/v4');
const { writeFile } = require('fs');
const { join } = require('path');
const { Varying, Map, Model, attribute, initial, transient, bind, from, List } = janus;
const { Env, compile, success, fail } = require('../exec/eval');
const { atomize, returnify } = require('../exec/code');
const { Block, Stacks } = require('./block');
const { Valuator } = require('./valuator');
const { mtimer } = require('../util/fs');
const { identity, blank, nonblank, ifexists, pop } = require('../util/util');
const { Flyout, Sticky } = require('./chrome');
const { debounce } = require('janus-stdlib').varying;


class IdAttribute extends attribute.Text {
  get writeInitial() { return true; }
  initial() { return uuid(); }
}
class TransientList extends attribute.List.withInitial() {
  get transient() { return true; }
}


class Statement extends Model.build(
  transient('result'),
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('code', attribute.Text)
) {
  get isStatement() { return true; }
}
const Statements = List.of(Statement);


// TODO: break up a bit maybe; separating the flyout/etc ui service stuff from the
// canonical data, from the execution machinery, at least code-wise, would be nice.
class Assembly extends Model.build(
  attribute('id', IdAttribute),
  initial('name', 'new assembly', attribute.Text),
  attribute('statements', attribute.List.of(Statements).withInitial()),
  attribute('stacks', attribute.List.of(Stacks).withInitial()),
  bind('bindings', from('result').map(x => success.match(x, (y => new Env(y))))),

  bind('base-stale', from('base-mtimes').and('base-freshness').asVarying()
    .all.flatMap(ifexists((mtimes, freshness) =>
      mtimes.any(mtime => freshness.map(f => mtime > f))))),

  bind('fs-mtime', from('project').get('context').get('watch.root')
    .and('project').get('context').get('watch.pattern')
    .all.flatMap(ifexists((root, pattern) => mtimer(root, pattern)))),
  attribute('ui-hot-reload', class extends attribute.Boolean {
    initial() { return true; }
    get transient() { return true; }
  }),

  attribute('flyouts', TransientList),
  attribute('stickies', TransientList),
  attribute('console-output', TransientList),
  attribute('console-input', class extends attribute.Text {
    get transient() { return true; }
  }),

  transient('project'),
  transient('bindings'),
  transient('freshness'),
  transient('result'),
  transient('base-statements'),
  transient('base-freshness'),
  transient('base-mtimes'),
  transient('base-stale'),
  transient('fs-mtime'),
  transient('ui-saved')
) {
  _initialize() {
    // don't do any work if we don't have a project.
    if (this.get_('project') == null) return;

    // any time the repl is empty, create a statement.
    const statements = this.get_('statements');
    this.reactTo(statements.length, l => { if (l === 0) this.createStatement(); });

    // any time the very last statement is finalized, make a new one following.
    this.reactTo(this.get('statements').flatMap(ifexists(statements =>
        statements.at(-1).flatMap(ifexists((s) => s.get('result'))))),
      result => { if (result != null) this.createStatement(); });

    // get base assembly statements to start.
    this.getBase();

    // if we should do a hot reload, .. do a hot reload.
    this.reactTo(Varying.all([ this.get('freshness'), this.get('fs-mtime'), this.get('ui-hot-reload') ]), (runtime, mtime, reload) => {
      if (reload !== true) return;
      if (mtime > runtime) this.run();
    });
  }

  getBase() {
    const statements = [];
    const mtimes = [];

    const project = this.get_('project');
    let ptr = this; // n.b. cycles between Assembly record and fs Listing record.
    while (ptr.get_('base') && (ptr = project.getAssembly_(ptr.get_('base')))) {
      mtimes.push(ptr.get('mtime'));
      ptr = Assembly.deserialize(JSON.parse(ptr.get_('content')));
      statements.unshift(...ptr.get_('statements').list);
    }

    this.set('base-freshness', new Date());
    this.set('base-mtimes', (new List(mtimes)).flatMap(identity));
    this.set('base-statements', new List(statements));
  }

  duplicate() {
    this.set('name', this.get_('name') + '+');
    this.set('id', uuid());
    this.save();
  }
  save() {
    // TODO: here? in assembly? in Listing?
    const base = this.get_('project').get_('path');
    const content = JSON.stringify(this.serialize());
    const id = this.get_('id');
    writeFile(join(base, 'assemblies', `${id}.json`), content, pop(this, 'ui-saved'));
  }


  ////////////////////////////////////////////////////////////////////////////////
  // statement management

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


  ////////////////////////////////////////////////////////////////////////////////
  // statement execution

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
    const statements = this.get_('base-statements').list.concat(this.get_('statements').list);
    for (const statement of statements) {
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
    this.set('freshness', new Date());
    this.set('result', bindings);
  }


  ////////////////////////////////////////////////////////////////////////////////
  // on-demand execution

  // runs an action statement in context of the current assembly result.
  // returns the result.
  exec(code, additional) {
    const result = this.get_('result');
    if (!success.match(result)) return fail();
    const bindings = Object.assign({}, result.get(), additional);

    const returnified = returnify(code);
    if (returnified === false) return fail('syntax error'); // TODO: better.

    return compile(new Env(bindings), returnified).flatMap(f => f());
  }

  execConsole() {
    const code = this.get_('console-input');
    const result = this.exec(code);
    const succeeded = success.match(result);

    if (succeeded) {
      const freshness = new Date();
      this.get_('console-output').add(new Block({ type: 'action', code, result, freshness }));
      this.set('console-input', '');
    }

    return succeeded;
  }


  ////////////////////////////////////////////////////////////////////////////////
  // ui services

  flyout(trigger, subject, options) {
    const flyouts = this.get_('flyouts');
    const trigger_ = trigger[0];
    for (const flyout of flyouts)
      if (flyout.get_('trigger_') === trigger_)
        return; // don't allow multiple flyouts from the same source.
    flyouts.add(new Flyout({ trigger, trigger_, subject, options }));
  }

  valuator(trigger, options, callback) {
    const valuator = new Valuator(Object.assign({ callback }, options));
    this.get_('stickies').add(new Sticky({ trigger, subject: valuator }));
    return valuator;
  }
}
const Assemblies = List.of(Assembly);


module.exports = { Statement, Statements, Assembly, Assemblies };

