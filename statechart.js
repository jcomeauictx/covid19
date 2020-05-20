console.log('statechart.js starting');

// You can pass in the state and style ('total' or 'new') in the URL
let parameters = new URLSearchParams(location.search);
cjc.state = (parameters.get('state') || 'OH').toUpperCase();
cjc.style = (parameters.get('style') || 'new').toLowerCase();

cjc.drawChart = function() {
  console.log('cjc.drawChart() starting');
  const data = new google.visualization.DataTable();
  data.addColumn('date', 'Week Ending');
  data.addColumn('number', 'Covid-19 Deaths');
  data.addColumn('number', 'Covid-19 Confirmed Cases');

  data.addRows(cjc.process(
    cjc.CovidDeathsUsafacts,
    cjc.CovidConfirmedUsafacts)
  );

  const options = {
    title: cjc.state + ' Covid-19 Data from https://jc.unternet.net/covid19/',
    legend: {position: 'bottom', alignment: 'center'},
    vAxis: {
      title: cjc.style.replace(/^\w/, (c) => c.toUpperCase()) +
        ' Deaths and Cases'
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

cjc.process = function(deaths, cases) {
  console.log('starting cjc.process()');
  if (deaths[0].length != cases[0].length) console.error('mismatching headers');
  else {
    let header = deaths[0];
    let dataOffset = null, stateOffset = null;
    if (header[0] == 'countyFIPS' && header[2] == 'State') {
      stateOffset = 2;
      for (let i = 0; i < header.length; i++) {
        // offset of actual data will be same as first Date in header
        if (typeof(header[i]) == 'object') {
          dataOffset = i;
          break;
        } else {
          console.log('not an object: ' + header[i]);
        }
      }
      console.log('dataOffset: ' + dataOffset);
    } else {
      console.log('unexpected header', header);
    }
    deaths = deaths.slice(1).filter(row => row[stateOffset] == cjc.state);
    cases = cases.slice(1).filter(row => row[stateOffset] == cjc.state);
    if (dataOffset != null && stateOffset != null) {
      let chartData = [];
      for (let column = dataOffset; column < header.length; column++) {
        let deathSum = 0, caseSum = 0;
        for (let row = 0; row < deaths.length; row++) {
          deathSum += deaths[row][column];
        }
        for (let row = 0; row < cases.length; row++) {
          caseSum += cases[row][column];
        }
        chartData.push([header[column], deathSum, caseSum]);
      }
      if (cjc.style == 'new') {
        // go back through it and calculate difference from the day before
        console.log('before derivative', chartData);
        for (let i = chartData.length - 1; i > 0; i--) {
          chartData[i][1] -= chartData[i - 1][1];
          chartData[i][2] -= chartData[i - 1][2];
        }
        console.log('after derivative', chartData);
      }
      return chartData;
    }
  }
};

window.addEventListener('load', function() {
  google.charts.load('current', {packages: ['corechart', 'line']});
  google.charts.setOnLoadCallback(cjc.drawChart);
  console.log('google charts called');
});

/* vim: set tabstop=8 expandtab shiftwidth=2 softtabstop=2: */
