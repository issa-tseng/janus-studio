const $ = require('jquery');
const { DomView, template, find, from, Model, bind } = require('janus');
const { App, Tab } = require('../model/app');
const { exists } = require('../util/util');
const { delay } = require('janus-stdlib').varying;

class AppView extends DomView.build($(`
  <header>
    <div id="title"><h1>janus studio</h1></div>
    <div id="tabs"></div>
    <button id="new-tab">+</button>
  </header>
  <div id="active"/>
`), template(
  find('#tabs')
    .render(from.attribute('active'))
      .criteria({ style: 'list' })
      .options({ renderItem: _ => _.context('tab') })
    .classGroup('count-', from('tabs').flatMap(ts => ts.length).pipe(delay(0)))
    .classed('hide', from('tabs').flatMap(ts => ts.length).map(l => l === 1)
      .and('tabs').get(0).get('content').map(exists)
      .all.map((single, hasContent) => single && !hasContent)),
  find('#new-tab').on('click', (_, app) => { app.tab(); }),
  find('#active').render(from('active'))
)) {
  _wireEvents() {
    $('body').on('keydown', event => {
      if (event.metaKey && (event.which === 84)) this.subject.tab();
      if (event.metaKey && (event.which === 188)) {
        event.preventDefault();
        this.subject.get_('active').destroy();
      }
    });
  }
}

const TabView = DomView.build(
  Model.build(bind('has-content', from.subject('content').map(x => x != null))),
  $(`<div/>`),
  find('div')
    .render(from('content').and.app('project').all.map((c, p) => c || p))
    .context(from.vm('has-content').map(h => h ? null : 'browser'))
);

const TabTabView = DomView.build(
  $('<div class="tab"><span class="tab-name"/> <button class="tab-close">&times;</button></div>'),
  template(
    find('.tab-name').text(from('content').get('name').map(name => name || 'browser')),
    find('.tab-close').on('click', (_, tab) => { tab.destroy(); }) // TODO: warnings and shit
  )
);


module.exports = {
  AppView, TabView,
  register(library) {
    library.register(App, AppView);
    library.register(Tab, TabView);
    library.register(Tab, TabTabView, { context: 'tab' });
  }
};

