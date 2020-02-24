const $ = require('jquery');
const { DomView, template, find, from } = require('janus');
const { App, Transfer } = require('../model/app');

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


module.exports = {
  AppView,
  register(library) {
    library.register(App, AppView);
  }
};

