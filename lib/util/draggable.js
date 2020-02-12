const $ = require('jquery');
const $window = $(window);

const { Varying, Model, bind, from, List } = require('janus');
const { zipSequential } = require('janus-stdlib').varying;
const { ifexists, last } = require('./util');


class Drag extends Model.build(
  bind('dx', from('x').and('startx').all.map((x, s) => x - s)),
  bind('dy', from('y').and('starty').all.map((y, s) => y - s))
) {
  constructor(view, clone, dom, x, y) { super({ view, clone, dom, startx: x, starty: y, x, y }); }

  _initialize() {
    // you can set either before or after and it'll work it out.
    this.reactTo(this.get('before').map(ifexists(z => z.previousElementSibling)), this.set('after'));
    this.reactTo(this.get('after').map(ifexists(z => z.nextElementSibling)), this.set('before'));

    // now update dom classes as appropriate.
    const classy = it => {
      this.reactTo(this.get(it).map($).pipe(zipSequential), ([ prev, now ]) => {
        if (prev) prev.removeClass(`drag-${it}`);
        if (now) now.addClass(`drag-${it}`);
      });
    };
    /* always */ classy('before'); /* and always */ classy('after');
  }

  unsetBoth() { this.unset('before'); this.unset('after'); }
  zero() { this.set('x', this.get_('startx')); this.set('y', this.get_('starty')); }

  seek(stacks) { return (event) => {
    const self = this.get_('dom');
    const x = event.pageX, y = event.pageY;
    this.set('x', x); this.set('y', y);

    for (const stack_ of stacks.children()) {
      const stack = $(stack_);
      const left = stack.offset().left;
      if (x < left) return;
      if (x > left + stack.outerWidth(true)) continue;

      const children = stack.find('.stack-blocks > .janus-list').children();
      if (children.length === 0) {
        this.set('stack', stack); this.unsetBoth();
        return;
      }

      for (const child_ of children) {
        const child = $(child_);
        if (child.is(self)) continue;
        if (y < (child.offset().top + (child.outerHeight() / 2))) {
          if (child.prev().is(self)) {
            this.unset('stack'); this.unsetBoth();
          } else {
            this.set('stack', stack); this.set('before', child_);
          }
          return;
        }
      }

      // fell through. last child.
      if (!(self.parents().is(stacks)) || self.next().length) {
        this.set('stack', stack); this.set('after', last(children));
      } else {
        this.unset('stack'); this.unsetBoth();
      }
      return;
    }
  }; }

  commit() {
    const stack_ = this.get_('stack');
    if (!stack_) return false;
    const stackView = stack_.data('view');
    const stack = stackView.subject;

    const view = this.get_('view');
    const source = view.subject;
    const parent = view.closest_(List);
    if (parent) parent.subject.remove(source);

    const blocks = stack.get_('blocks');
    const before = this.get_('before');
    const idx = before ? $(before).prevAll().length : blocks.length_;

    // TODO: shadow may not work as desired:
    const drop = (this.get_('clone') === true) ? source.shadow() : source;
    stack.get_('blocks').add(drop, idx);

    stackView.into_('blocks').into_(idx).artifact().addClass('dropped');
    return true;
  }
}

// view is the view to be dragged, but target is the true model to be dropped.
const drag = (event, view, clone) => {
  event.preventDefault();
  const dom = view.artifact();
  dom.addClass('dragging');
  const op = new Drag(view, clone, dom, event.pageX, event.pageY);

  op.reactTo(
    Varying.all([ op.get('dx'), op.get('dy') ])
      .map((dx, dy) => `translate(${dx}px, ${dy}px)`),
    (str => dom.css('transform', str)));

  const stacks = $('.assembly-stacks > .janus-list'); // TODO: still not right.
  op.listenTo($window, 'mousemove', op.seek(stacks));

  op.on('destroying', () => {
    dom.find('.janus-inspect-panel').trigger('mouseout'); // TODO: no.
    const success = op.commit();
    if (!clone || !success) dom.removeClass('dragging'); // TODO: brittle.
    op.unsetBoth();
    op.zero();
    if (clone) dom.removeClass('dragging');
  });

  $window.one('mouseup', _ => { op.destroy() });
};

module.exports = { drag };

