$('.faux-select').click(function(){
  $(this).toggleClass('open');
  $('.options',this).toggleClass('open');
});

$('.options li').click(function(){
  var selection = $(this).text();
  var dataValue = $(this).attr('data-value');
  $('.selected-option span').text(selection);
  $('.faux-select').attr('data-selected-value',dataValue);
});