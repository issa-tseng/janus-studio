const $ = require('jquery');
const { DomView, template, find, from } = require('janus');
const { Assembly } = require('../model/assembly');
const { Stack, Block } = require('../model/block');
const { DomViewInspector } = require('janus-inspect').inspector.domview;

// n.b. the subject here is a DomViewInspector.
class ViewView extends DomView.build($(`
  <div class="view-panel">
    <button class="view-pin">+</button>
    <div class="view-view"/>
    <div class="view-inspector"/>
  </div>
`), template(
  find('.view-inspector').render(from.subject()).context('panel').criteria({ inspect: true }),
  find('.view-pin').on('click', (_, __, view) => {
    const block = view.closest_(Block).subject;
    view.closest_(Assembly).subject.togglePin(block);
  })
)) {
  _render() {
    const dom = this.dom();

    const style = $('<style/>');
    const project = this.closest_(Assembly).subject.get_('project');
    this.reactTo(project.get('stylesheet'), (styles) => { style.text(styles); });

    const artifact = this.subject.get_('target').artifact();
    const root = $('<div/>').append(artifact).append(style);

    const shadow = dom.find('.view-view')[0].attachShadow({ mode: 'open' });
    shadow.appendChild(root[0]);

    this._bindings = this.preboundTemplate(dom, this.pointer());
    return dom;
  }
}

module.exports = {
  ViewView,
  register(library) {
    library.register(DomViewInspector, ViewView, { context: 'panel', priority: 10 });
  }
};

