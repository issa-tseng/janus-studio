const $ = require('jquery');
const { DomView, Varying, List } = require('janus');
const jInspect = require('janus-inspect');
const { reference } = jInspect.types;
const { drag } = require('./draggable');

// we make our own inspect() that prevents re-inspection.
const inspect = (x) => ((x != null) && (x.isInspector === true)) ? x : jInspect.inspect(x);


// traces up the inspector stack until it gets to a Block.
// gives a new Block with the whole stack encoded.
// TODO: elsewhere? / TODO: success() / fail()
const trace = (view) => {
  const { Block } = require('../model/machine'); // TODO: blah.
  const links = [];
  let ptr = view;
  do {
    const subject = ptr.subject;
    if (subject.isBlock) {
      const to = subject.get_('to');
      if (to != null) return new Block({ to: subject.get_('to'), links: new List(links) });
      else return new Block({ code: subject.get_('code'), links: new List(links) });
    }
    if (subject.isStatement) return new Block({ to: subject, links: new List(links) });

    const reference = ptr.options.__ref;
    if (reference) links.unshift(reference);

    if (ptr.options.__source) ptr = ptr.options.__source;
    else return;
  } while (true);
};

// traces up a varying stack to deliver a single reference.
// TODO: really, janus-inspect should do this level-by-level but
// it's easier to mock up here just to be sure it works.
const traceVarying = (dom) => {
  const ref = [];
  let linkCtr = -1;
  for (const parent of dom.parents()) {
    const node = $(parent);
    if (node.hasClass('linkedList-node')) {
      linkCtr++;
    } else if (node.hasClass('varying-tree-nexts')) {
      ref.unshift(reference.varyingApplicant(linkCtr));
      linkCtr = -1;
    } else if (node.hasClass('varying-tree-inner')) {
      ref.unshift(reference.varyingInner());
    } else if (node.hasClass('panel-content')) {
      return ref;
    }
  }
  throw new Error('uhhh');
};


// we also hijack all inspection panel creation to perform toolbox injection
// and highlighting.
//
// mostly copied from janus-docs
const toolbox = `<div class="panel-handle"/>`;
const decorateInspectors = (app) => {
  const cache = new WeakMap();

  app.on('inspected', (view) => {
    if (typeof view.highlight !== 'function') return;
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
      const block_ = dom.closest('.block');
      if (block_.length) {
        const block = block_.data('view').subject;
        if (block.get_('type') === 'reference') {
          const clone = !!dom.closest('.atom').length;
          drag(event, block_.data('view'), clone);
        } else {
          const asRef = trace(view).with({ code: block.get_('code') });
          drag(event, view, false, asRef);
        }
      } else {
        drag(event, view, false, trace(view));
      }
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

module.exports = { inspect, decorateInspectors, traceVarying };

