const { DomView, template, find, from, Model, bind, initial, attribute, match, otherwise } = require('janus');
const { identity, give, exists, ifexists, blank, nonblank } = require('../util/util');
const { Statement, Stack, Block, Assembly } = require('../model/machine');
const { inspect } = require('../util/inspect');


const StatementView = DomView.build(
  Model.build(
    bind('has-name', from.subject('name').map(nonblank)),
    bind('status', from.subject('result').map(match(
      inert(give('inert')), success(give('success')), fail(give('fail')), otherwise(give('none'))))),

    initial('panel', false, attribute.Boolean),
    bind('context', from('panel').map(p => p ? 'panel' : null))
), $(`
  <div class="atom">
    <button class="atom-insert" title="Add atom">+</button>
    <button class="atom-remove" title="Delete statement">&times;</button>
    <div class="atom-code"/>
    <div class="atom-lower">
      <span class="atom-name-edit"/>
      <span class="atom-name"><span class="name"/><span class="binding"/></span>
      <span class="atom-result"/>
      <span class="atom-panel" title="View as panel"/>
    </div>
  </div>
`), template(
  find('.atom')
    .classed('has-name', from.vm('has-name'))
    .classGroup('status-', from.vm('status'))
    .classed('has-result', from('result').map(exists))
    .classed('is-panel', from.vm('panel')),

  find('.atom-name-edit').render(from.attribute('name'))
    .options({ placeholder: 'result' }),
  find('.atom-name .name').text(from.get('name').map(x => x || 'result')),
  find('.atom-name .binding').text(from.get('name').map(x => blank(x) ? ':' : '=')),

  find('.atom-insert').on('click', (e, atom, view) => {
    const polymer = view.closest_(Assembly).subject;
    const idx = polymer.get_('atoms').list.indexOf(atom);
    polymer.createStatement(idx);
  }),
  find('.atom-remove').on('click', (e, atom) => { atom.destroy(); }),
  find('.atom-panel').render(from.vm().attribute('panel'))
    .criteria({ style: 'button' })
    .options({ stringify: give('\u25a1') }),

  find('.atom-result').render(from.vm('panel')
    .and.subject()
    .and('result').map(ifexists(c => c.mapSuccess(inspect).get()))
    .all.map((panel, to, result) => (panel === true)
      ? new Block({ to, panel })
      : result)),

  find('.atom-code').render(from.attribute('code'))
    .criteria({ style: 'code' })
    .options(from.self().map((view) => ({ onCommit: _ =>
      view.closest_(Assembly).subject.commit(view.subject)
    })))
));


class AssemblyView extends DomView.build($(`
  <div class="assembly">
    <h1 class="assembly-name"/>
    <div class="assembly-statements"/>
    <div class="assembly-stacks"/>
    <div class="flyouts"/>
  </div>`
), template(
  find('.assembly-name').render(from.attribute('name')),
  find('.assembly-statements').render(from('statements')),
  find('.assembly-stacks').render(from('stacks')),
  find('.flyouts').render(from('flyouts'))
)) {
  _initialize() { this.subject.run(); }
  _wireEvents() {
    const dom = this.artifact();

    dom.on('mouseenter', '.entity-title', event => {
      const target = $(event.currentTarget);
      const entity = target.closest('.janus-inspect-entity');
      if (entity.hasClass('no-panel')) return;
      if (entity.length) {
        const inspector = entity.data('view').subject;
        this.subject.flyout(target, inspector);
      }
    });
  }
};


const StackView = DomView.build($(`
  <div class="stack">
    <h1 class="stack-name"/>
    <div class="stack-blocks"/>
  </div>
`), template(
  find('.stack-name').render(from.attribute('name')),
  find('.stack-blocks').render(from('blocks'))
));


const BlockView = DomView.build($(`
  <div class="block">
    <div class="block-target"/>
  </div>
`), template(
  find('.block-target')
    .render(from.subject().and.self().all.flatMap((block, view) =>
      block.resolve(view.closest_(Assembly).subject)))
    .context(from('panel').flatMap(identity).map(p => (p === false) ? null : 'panel'))
));


module.exports = {
  StatementView, AssemblyView, BlockView,
  register(library) {
    library.register(Statement, StatementView);
    library.register(Assembly, AssemblyView);
    library.register(Stack, StackView);
    library.register(Block, BlockView);
  }
};

