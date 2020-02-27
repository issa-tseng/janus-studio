const $ = require('jquery');
const { DomView, template, find, from } = require('janus');
const { Assembly } = require('../model/assembly');
const { Block, Stack } = require('../model/block');
const { drag } = require('../util/draggable');
const { identity } = require('../util/util');

const BlockView = DomView.build($(`
  <div class="block">
    <button class="block-delete">&times;</button>
    <div class="block-handle"></div>
    <div class="block-title">Action</div>
    <div class="block-code"/>
    <button class="block-run">&#9656;</button>
    <div class="block-target"/>
  </div>
`), template(
  find('.block')
    .classGroup('type-', from('type'))
    .classed('stale', from('result')
      .and.self().map(view => view.closest_(Assembly).subject).get('freshness')
      .and('freshness')
      .all.map((r, af, bf) => success.match(r) && (af > bf))),

  find('.block-delete').on('click', (_, block) => { block.destroy(); }),

  // go through extra work here to save a CM instance.
  find('.block-code')
    .render(from.attribute('code').and('type')
      .all.map((attr, type) => (type === 'action') ? attr : null))
    .criteria({ style: 'code' })
    .options(from.self().map((view) => ({ onCommit: _ =>
      view.subject.exec(view.closest_(Assembly).subject)
    }))),

  find('.block-run').on('click', (_, subject, view) => {
    subject.exec(view.closest_(Assembly).subject)
  }),

  find('.block-target')
    .render(from.subject().and.self().all.flatMap((block, view) =>
      block.resolve(view.closest_(Assembly).subject)))
    .options(from.self().map(__source => ({ __source })))
    .context(from('panel').flatMap(identity).map(p => (p === false) ? null : 'panel')),

  find('.block-handle').on('mousedown', (event, block, view) => {
    drag(event, view, false, block);
  })
));


const StackView = DomView.build($(`
  <div class="stack">
    <h1 class="stack-name"/>
    <div class="stack-blocks"/>
  </div>
`), template(
  find('.stack-name').render(from.attribute('name')),
  find('.stack-blocks').render(from('blocks'))
));


module.exports = {
  BlockView, StackView,
  register(library) {
    library.register(Block, BlockView);
    library.register(Stack, StackView);
  }
};

