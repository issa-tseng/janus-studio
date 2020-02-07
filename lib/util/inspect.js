const $ = require('jquery');
const { DomView, Varying } = require('janus');
const jInspect = require('janus-inspect');
const { drag } = require('./draggable');
const { Reference } = require('../model/project');

// we make our own inspect() that prevents re-inspection.
const inspect = (x) => ((x != null) && (x.isInspector === true)) ? x : jInspect.inspect(x);


// we also hijack all inspection panel creation to perform toolbox injection
// and highlighting.
//
// mostly copied from janus-docs
const toolbox = `<div class="panel-handle"/>`;
const decorateInspectors = (app) => {
  const cache = new WeakMap();

  app.on('createdView', (view) => {
    if (view.subject == null) return;
    if (view.subject.isInspector !== true) return;
    const target = view.highlight();

    // inject toolbox
    const dom = view.artifact();
    dom.find('.janus-inspect-pin').replaceWith(toolbox);

    // do highlighting
    let tracker = cache.get(target); // ugh js
    if (tracker == null) cache.set(target, (tracker = new Varying(0)));
    view.reactTo(tracker, (hover) => { view.artifact().toggleClass('highlight', hover > 0); });

    // set up dragging (TODO: maybe elsewhere?)
    dom.find('.panel-handle').on('mousedown', (event) => {
      const cref = dom.closest('.reference');
      if (cref.length) drag(event, cref.data('view'));

      const atom = dom.closest('.atom');
    });
  });

  // set up highlighting in general
  let lastEvent = null; // essentially a scoped stopPropagation
  $('body').on('mouseover', '.highlights', (event) => {
    if (event.originalEvent === lastEvent) return;
    lastEvent = event.originalEvent;

    const dom = $(event.currentTarget);
    const tracker = cache.get(dom.data('view').highlight());
    if (tracker != null) {
      tracker.set(tracker.get() + 1);
      dom.one('mouseout', _ => { tracker.set(tracker.get() - 1); });
    }
  });
};


// TODO: copied from janus-docs like most other things here.
const { ListView } = require('janus-stdlib').view($).list;
const { Mutation, DomViewInspector } = jInspect.inspector.domview;
const listViewExtractor = (view) => view._mappedBindings.mapPairs((idx, binding) =>
  new Mutation({ operation: `[${idx}]`, binding: (binding ? binding.parent : null) }));
DomViewInspector.extractors.register(ListView, listViewExtractor);

module.exports = { inspect, decorateInspectors };

