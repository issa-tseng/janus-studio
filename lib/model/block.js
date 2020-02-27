const { Varying, Model, attribute, transient, List } = require('janus');
const { DomViewInspector } = require('janus-inspect').inspector.domview;
const { reference } = require('janus-inspect').types;
const { success } = require('../exec/eval');
const { inspect } = require('../util/inspect');
const { ifexists } = require('../util/util');

// at each navigation step, we /always/ return a Varying.
const navigate = (m, x) => Array.isArray(x)
  ? new List(x).flatFoldl(new Varying(m), _navigate)
  : _navigate(m, x);
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
  }),

  reference.varyingApplicant(idx => new Varying(m.a[idx])),
  reference.varyingInner(_ => m.__inspector.get('inner'))
)(x));
class Block extends Model.build(
  attribute('type', class extends attribute.Enum {
    _values() { return [ 'reference', 'action' ]; }
    initial() { return 'reference'; }
  }),

  attribute('code', attribute.Text),
  transient('result'),
  transient('freshness')
) {
  get isBlock() { return true; }

  resolve(assembly) {
    if (this.get_('type') === 'action')
      return this.get('result').map(ifexists(c => c.mapSuccess(inspect).get()));

    const exec = (code => assembly.exec(code));
    const to = this.get_('to'); // TODO: i think this is immutable?
    const code = this.get_('code'); // TODO: and this?

    const root =
      (code != null) ? assembly.get('result').map(_ => assembly.exec(code)) :
      ((typeof to === 'string') ? assembly.getStatement(to) : to).get('result');
    return Varying.all([ root, this.get('links') ])
      .flatMap(ifexists((c, links) => c.mapSuccess(x =>
        links ? links.flatFoldl(Varying.of(x), navigate).map(inspect) : inspect(x)
      ).get()));
  }

  exec(assembly) {
    const result = assembly.exec(this.get_('code'));
    this.set('freshness', new Date());
    this.set('result', result);
    // TODO: no. surface the error.
    return success.match(result);
  }
}
const Blocks = List.of(Block);


class Stack extends Model.build(
  attribute('name', attribute.Text),
  attribute('wider', attribute.Boolean),
  attribute('blocks', attribute.List.of(Blocks))
) {}
const Stacks = List.of(Stack);


module.exports = { Block, Blocks, Stack, Stacks };
