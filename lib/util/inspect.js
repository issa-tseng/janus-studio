const { DomView } = require('janus');
const jInspect = require('janus-inspect');

// we make our own inspect() that prevents re-inspection.
const inspect = (x) => ((x != null) && (x.isInspector === true)) ? x : jInspect.inspect(x);


// TODO: copied from janus-docs like most other things here.
const { ListView } = require('janus-stdlib').view($).list;
const { Mutation, DomViewInspector } = jInspect.inspector.domview;
const listViewExtractor = (view) => view._mappedBindings.mapPairs((idx, binding) =>
  new Mutation({ operation: `[${idx}]`, binding: (binding ? binding.parent : null) }));
DomViewInspector.extractors.register(ListView, listViewExtractor);

module.exports = { inspect };

