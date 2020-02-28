const $ = require('jquery');
const { DomView, template, find, from, Model, bind } = require('janus');
const { App, Tab } = require('../model/app');

const AppView = DomView.build($(`
  <header>
    <div id="title"><h1>janus studio</h1></div>
    <div id="tabs"></div>
  </header>
  <div id="active"/>
`), template(
  find('#tabs').render(from.attribute('tabs')),
  find('#active').render(from('active'))
));

const TabView = DomView.build(
  Model.build(bind('has-content', from.subject('content').map(x => x != null))),
  $(`<div/>`),
  find('div')
    .render(from('content').and.app('project').all.map((c, p) => c || p))
    .context(from.vm('has-content').map(h => h ? null : 'browser'))
);


module.exports = {
  AppView, TabView,
  register(library) {
    library.register(App, AppView);
    library.register(Tab, TabView);
  }
};

