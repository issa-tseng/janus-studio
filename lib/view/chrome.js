const $ = require('jquery');
const { DomView, find, from } = require('janus');
const { Flyout, Sticky } = require('../model/chrome');
const { positionFlyout } = require('../util/dom');

class FlyoutView extends DomView.build(
  $('<div class="flyout"/>'),
  find('.flyout')
    .render(from('subject')).context('panel') // TODO: weird context
      .options(from('options').and('trigger').all.map((options, trigger) =>
        Object.assign({ trigger }, options)))
    .on('mouseenter', (_, subject) => { subject.set('hover.target', true); })
    .on('mouseleave', (_, subject) => { subject.set('hover.target', false); })
) {
  _wireEvents() {
    positionFlyout(this.subject.get_('trigger'), this.artifact());

    this.destroyWith(this.subject.get_('target')); // inspection target
    this.destroyWith(this.subject);
    this.subject.destroyWith(this);
  }
}


class StickyView extends DomView.build(
  $('<div class="sticky"/>'),
  find('.sticky').render(from('subject'))
) {
  _wireEvents() {
    positionFlyout(this.subject.get_('trigger'), this.artifact());
    this.destroyWith(this.subject);
    this.subject.destroyWith(this);
  }
}


module.exports = {
  FlyoutView, StickyView,
  register(library) {
    library.register(Flyout, FlyoutView);
    library.register(Sticky, StickyView);
  }
};

