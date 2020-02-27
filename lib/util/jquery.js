const $ = window.$ = require('jquery');

$.fn.view = function() {
  let ptr = this;
  while (ptr.length > 0) {
    const view = ptr.data('view')
    if (view != null) return view;
    ptr = ptr.parent();
  }
};

$.fn.offsetCenter = function() {
  const offset = this.offset();
  offset.top += (this.height() / 2);
  offset.left += (this.width() / 2);
  return offset;
};

