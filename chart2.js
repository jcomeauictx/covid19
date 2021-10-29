google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(drawChart2);

function drawChart2() {
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Flu Season Week');
  for (let i = 0; i < legend.length; i++) {
    data.addColumn('number', legend[i]);
  }

  data.addRows(fluData);

  // legend.maxLines only works when legend.position == 'top'
  const options = {
    title: 'CDC Flu Season Weekly Deaths from https://jc.unternet.net/covid19/',
    legend: {position: 'top', alignment: 'center', maxLines: 10},
    vAxis: {
      title: 'Total Deaths',
    }
  };

  const container = document.getElementById('chart2_div');
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
