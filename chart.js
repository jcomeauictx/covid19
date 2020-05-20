google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  const data = new google.visualization.DataTable();
  data.addColumn('date', 'Week Ending');
  data.addColumn('number', 'Covid-19 Deaths');
  data.addColumn('number', 'Deaths from all causes');
  data.addColumn('number', 'Percentage of Expected Deaths');

  data.addRows(cdcData);

  const options = {
    title: 'CDC Provisional Death Data from https://jc.unternet.net/covid19/',
    legend: {position: 'bottom', alignment: 'center'},
    series: {
      0: {targetAxisIndex: 0},
      1: {targetAxisIndex: 0},
      2: {targetAxisIndex: 1},
    },
    vAxes: {
      0: {title: 'Deaths'},
      1: {title: 'Percent Expected'}
    }
  };

  const container = document.getElementById('chart_div');
  const chart = new google.visualization.LineChart(container);
  let state = 'uninitialized';
  let saved = '';
  google.visualization.events.addListener(chart, 'ready', function () {
    state = 'interactive';
    container.title = 'Click for PNG image rather than interactive chart.';
    console.log('container ' + container + ' is ready.');
  });
  container.addEventListener('click', function () {
    console.log('before: state=' + state + ', title=' + container.title);
    if (state == 'interactive') {
      saved = container.innerHTML;
      container.innerHTML = '<img src="' + chart.getImageURI() + '">';
      state = 'static';
      container.title = 'Click for interactive chart rather than PNG image.';
    } else if (state == 'static') {
      container.innerHTML = saved;
      redraw();
      state = 'interactive';
      container.title = 'Click for PNG image rather than interactive chart.';
    }
    console.log('after: state=' + state + ', title=' + container.title);
  });
  redraw = function() {
    options.width = container.innerWidth;
    options.height = container.innerHeight;
    chart.draw(data, options);
  };
  window.addEventListener('resize', redraw);
  redraw();
}
/* vim: set tabstop=8 expandtab shiftwidth=2 softtabstop=2: */
