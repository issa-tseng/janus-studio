const $ = require('jquery');
const { Model, from, App, attribute, initial, List } = require('janus');
const { min } = Math;


class Studio extends App.build(
  attribute('tabs', attribute.List.withInitial()),
  attribute('active', class extends attribute.Enum {
    _values() { return from('tabs'); }
  }),

  initial.writing('flyouts', new List()),
  initial.writing('transfer', new List())
) {
  _initialize() {
    const original = this.original();
    this.listenTo(this, 'createdView', (view) => {
      if (view.subject == null) return;
      if (view.subject.isInspector !== true) return;
      original.emit('inspected', view);
    });

    // any time the last tab is closed, open a new one.
    this.reactTo(this.get_('tabs').length, l => { if (l === 0) this.tab(); });
  }

  tab() {
    const tab = new Tab();
    this.get_('tabs').add(tab);
    this.set('active', tab);
  }
  close() {
    const tab = this.get_('active');
    const tabs = this.get_('tabs');
    const idx = tabs.list.indexOf(tab);
    tab.destroy();
    this.set('active', tabs.at_(min(idx, tabs.length_ - 1)));
  }


  ////////////////////////////////////////
  // plumbthrough services
  // because inspect expects these on app

  flyout(trigger, subject, options) {
    const assembly = trigger.closest('.assembly').view().subject;
    return assembly.flyout(trigger, subject, options);
  }

  valuator(trigger, options, callback) {
    const assembly = trigger.closest('.assembly').view().subject;
    const valuator = assembly.valuator(trigger, options, callback);

    const flyout = trigger.closest('.flyout');
    if (flyout.length) flyout.view().subject.get_('children').add(valuator);

    return valuator;
  }
}

class Tab extends Model {}


module.exports = { App: Studio, Tab };

