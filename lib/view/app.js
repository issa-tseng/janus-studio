const $ = require('jquery');
const { DomView, template, find, from } = require('janus');
const { App, Transfer } = require('../model/app');

const AppView = DomView.build($(`
  <header>
    <div id="title"><h1>janus studio</h1></div>
    <div id="tabs"></div>
  </header>
  <div id="active"/>
  <div id="flyouts"/>
  <div id="transfer"/>
`), template(
  find('#tabs').render(from.attribute('tabs')),
  find('#active').render(from('active')),
  find('#flyouts').render(from('flyouts')),
  find('#transfer').render(from('transfer'))
));

const px = (x => `${x}px`);
const TransferView = DomView.build(
  $('<div class="transfer"/>'),
  find('.transfer')
    .css('left', from('x').map(px)).css('top', from('y').map(px))
    .css('width', from('w'))
    .render(from('target'))
);


module.exports = {
  AppView,
  register(library) {
    library.register(App, AppView);
    library.register(Transfer, TransferView);
  }
};

