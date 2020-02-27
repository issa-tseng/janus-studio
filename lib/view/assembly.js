const { DomView, template, find, from, Model, bind, initial, attribute, match, otherwise } = require('janus');
const { give, exists, ifexists, blank, nonblank } = require('../util/util');
const { Statement, Assembly } = require('../model/assembly');
const { delayedHover } = require('../util/dom');
const { inspect, traceVarying } = require('../util/inspect');


const StatementView = DomView.build(
  Model.build(
    bind('has-name', from.subject('name').map(nonblank)),
    bind('status', from.subject('result').map(match(
      inert(give('inert')), success(give('success')), fail(give('fail')), otherwise(give('none'))))),

    initial('panel', false, attribute.Boolean),
    bind('context', from('panel').map(p => p ? 'panel' : null))
), $(`
  <div class="statement">
    <button class="statement-insert" title="Add statement">+</button>
    <button class="statement-remove" title="Delete statement">&times;</button>
    <div class="statement-code"/>
    <div class="statement-lower">
      <span class="statement-name-edit"/>
      <span class="statement-name"><span class="name"/><span class="binding"/></span>
      <span class="statement-result"/>
      <span class="statement-panel" title="View as panel"/>
    </div>
  </div>
`), template(
  find('.statement')
    .classed('has-name', from.vm('has-name'))
    .classGroup('status-', from.vm('status'))
    .classed('has-result', from('result').map(exists))
    .classed('is-panel', from.vm('panel')),

  find('.statement-name-edit').render(from.attribute('name'))
    .options({ placeholder: 'result' }),
  find('.statement-name .name').text(from.get('name').map(x => x || 'result')),
  find('.statement-name .binding').text(from.get('name').map(x => blank(x) ? ':' : '=')),

  find('.statement-insert').on('click', (e, statement, view) => {
    const polymer = view.closest_(Assembly).subject;
    const idx = polymer.get_('statements').list.indexOf(statement);
    polymer.createStatement(idx);
  }),
  find('.statement-remove').on('click', (e, statement) => { statement.destroy(); }),
  find('.statement-panel').render(from.vm().attribute('panel'))
    .criteria({ style: 'button' })
    .options({ stringify: give('\u25a1') }),

  find('.statement-result')
    .render(from('result')
      .and.subject()
      .and.vm('panel')
      .all.map(ifexists((c, to, panel) => (panel === true)
        ? new Block({ to, panel })
        : c.mapSuccess(inspect).get())))
    .options(from.self().map(__source => ({ __source }))),

  find('.statement-code').render(from.attribute('code'))
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
    <div class="console">
      <button class="console-clear">&times;</button>
      <div class="console-output"/>
      <div class="console-input"/>
    </div>
    <div class="stickies"/>
    <div class="flyouts"/>
  </div>`
), template(
  find('.assembly-name').render(from.attribute('name')),
  find('.assembly-statements').render(from('statements')),
  find('.assembly-stacks').render(from('stacks')),

  find('.console').classGroup('count-', from('console-output').flatMap(o => o.length)),
  find('.console-clear')
    .classed('hide', from('console-output').flatMap(o => o.empty()))
    .on('click', (_, assembly) => { assembly.get_('console-output').removeAll(); }),
  find('.console-output').render(from('console-output')),
  find('.console-input').render(from.attribute('console-input'))
    .criteria({ style: 'code' })
    .options(from.self().map(view => ({ onCommit: _ => view.subject.execConsole() }))),

  find('.stickies').render(from('stickies')),
  find('.flyouts').render(from('flyouts'))
)) {
  _initialize() { this.subject.run(); }
  _wireEvents() {
    const dom = this.artifact();

    delayedHover(dom, '.entity-title', target => {
      if (target.closest('.dragging').length) return;

      const entity = target.closest('.janus-inspect-entity');
      if (entity.hasClass('no-panel')) return;
      if (entity.length) {
        const iview = entity.data('view');
        const { __source, __ref } = iview.options;
        const inspector = iview.subject;
        this.subject.flyout(target, inspector, { __source, __ref });
      }
    });

    delayedHover(dom, '.varying-node', target => {
      if (target.parents('.varying-tree').length === 2) return; // root node (self).

      const inspector = target.view().subject;
      const __source = target.closest('.janus-inspect-panel').view();
      const __ref = traceVarying(target);
      this.subject.flyout(target, inspector, { __source, __ref });
    });

    const consoleOutput_ = dom.find('.console-output')[0];
    this.reactTo(this.subject.get('console-output').flatMap(o => o.length), _ => {
      consoleOutput_.scrollTop = consoleOutput_.scrollHeight;
    });
  }
};


module.exports = {
  StatementView, AssemblyView,
  register(library) {
    library.register(Statement, StatementView);
    library.register(Assembly, AssemblyView);
  }
};

