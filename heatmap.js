/* Found the following discrepancies between the covid_* data from usafacts.org
 * and counties.svg:
 * fipsList - pathIds:  
 * Set(10) {"00000", "02105", "02275", "46102", "02230", …}
 * 0: "00000"
 * 1: "02105"
 * 2: "02275"
 * 3: "46102"
 * 4: "02230"
 * 5: "00001"
 * 6: "02198"
 * 7: "02195"
 * 8: "06000"
 * 9: "02158"
 * pathIds - fipsList:  
 * Set(7) {"02201", "02280", "02232", "46113", "51515", …}
 * 0: "02201"
 * 1: "02280"
 * 2: "02232"
 * 3: "46113"
 * 4: "51515"
 * 5: "State_Lines"
 * 6: "separator"
 *
 * 00001 is NYC unallocated; NYC consists of 5 counties: Kings (Brooklyn),
 *                           Queens, Richmond (Staten Island), Bronx,
 *                           New York (Manhattan)
 * 00000 is State unallocated.
 * 46102 is Oglala Lakota County, SD
 * 46113 is Shannon County, SD, now named Oglala Lakota County
*/

console.log('heatmap.js loading');
cjc.rgbcolor = function(string) {
  return string.replace(/[^\d,]/g, '').split(',');
}
cjc.rgbstring = function(array) {
  return 'rgb(' + array[0] + ',' + array[1] + ',' + array[2] + ')';
}
cjc.shuffle = function(array) {
  array.sort(() => Math.random() - 0.5);
}
cjc.mapping = {
  '46113': {id: '46102', label: 'Oglala Lakota, SD'}
};
cjc.debug = function(key) {
  if (cjc.debugging && (cjc.debugging == true || key == cjc.debugging)) {
    console.log(Array.from(arguments).slice(1));
  }
};
cjc.selection = null;
cjc.selected = null;
cjc.header = cjc.CovidConfirmedUsafacts[0];
cjc.data = cjc.CovidConfirmedUsafacts.slice(1);
cjc.changed = null;
cjc.debugging = false;  // set to true in console for verbose logging
// the following are filled in by window.onload
cjc.svgDoc = null;
cjc.svg = null;
cjc.defaultColor = null;
cjc.paths = {};
cjc.date = null;
cjc.area = null;
// the following are for the animation state machine
cjc.dataOffset = null;
cjc.state = null;
cjc.dateIndex = 0;
cjc.countyIndex = 0;
cjc.delay = 1; // ms between iterations
//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
cjc.difference = function(set0, set1) {
  let _difference = new Set(set0)
  for (let elem of set1) {
    _difference.delete(elem)
  }
  return _difference
}
cjc.init = function() {
  cjc.selection = document.getElementById('datafile');
  cjc.selected = cjc.selection[cjc.selection.selectedIndex].value;
  if (cjc.selected == 'CovidTestUsafacts') cjc.delay = 1000;
  cjc.header = cjc[cjc.selected][0];
  cjc.data = cjc[cjc.selected].slice(1)
  console.log('header', cjc.header.slice(0, 10), 'data', cjc.data[0].slice(10));
  if (cjc.header[0] == 'countyFIPS') {
    for (let i = 0; i < cjc.header.length; i++) {
      // offset of actual data will be same as first Date in header
      if (typeof(cjc.header[i]) == 'object') {
        cjc.dataOffset = i;
        break;
      }
    }
    console.log('dataOffset: ' + cjc.dataOffset);
  } else {
    console.log('unexpected header[0]', cjc.header[0]);
  }
  cjc.dateIndex = cjc.dataOffset;
  cjc.countyIndex = 0;
  cjc.shuffle(cjc.data);
  cjc.changed = cjc.data.filter(row => row[cjc.dateIndex] > 0);
  if (cjc.changed.length == 0) cjc.changed = cjc.data.slice(0, 1);
};
cjc.debugNext = function() {
  cjc.init();
  savedDebugging = cjc.debugging;
  cjc.debugging = true;
  cjc.next();
  cjc.debugging = savedDebugging;
};
cjc.next = function() {
  let red = 0, green = 0, blue = 0;
  let path = null;
  let countyFips = cjc.changed[cjc.countyIndex][0];
  let date = cjc.header[cjc.dateIndex];
  cjc.date.value = date;
  cjc.debug(true, 'plotting county ', countyFips, 'date', date);
  try {
    path = cjc.paths[countyFips];
  } catch (error) {
    console.log('null path for id ' + countyFips, error);
  }
  if (path != null) {
    cjc.area.value = path.getAttribute('title');
    let color = path.style.fill;
    let lastCount = parseFloat(path.getAttribute('data-count')) || 0;
    let weight = parseFloat(path.getAttribute('data-weight')) || -1;
    let count = cjc.changed[cjc.countyIndex][cjc.dateIndex];
    cjc.debug('color', 'color', color, 'weight', weight, 'count', count,
              'lastCount', lastCount);
    if (count > lastCount) {
      console.log(path.getAttribute('title') + ' count ' + count +
                  ' > ' + lastCount);
      // cap the weight such that hotspots that are cooling down will show that
      if (weight > -1) weight = Math.min(weight + 3, 30);
      else weight = 3;
    } else if (weight > 0) {
      weight -= .3;  // over 10 days we lose the last gain
      if (weight < 0.1) weight = 0;
    }
    // varies shade from green to brown to red and vice versa on cooling
    red = Math.round(weight) > -1 ? Math.round(Math.min(10 * weight, 255)) : 0;
    green = Math.round(255 - red);
    blue = 0;
    cjc.debug('color', 'weight ' + weight + ', rgb: ' +
              red + ', ' + green + ', ' + blue);
    path.setAttribute('data-weight', weight);
    path.setAttribute('data-count', count);
    if (weight > -1) {  // leave -1 at default color
      color = cjc.rgbstring([red, green, blue]);
    }
    path.style.fill = color;
  } else {
    console.log('key ' + countyFips + ' has no matching <path>');
  }
  cjc.countyIndex++;
  if (cjc.countyIndex == cjc.changed.length) {
    cjc.countyIndex = 0;
    cjc.dateIndex++;
    if (cjc.dateIndex == cjc.header.length) {
      cjc.dateIndex = cjc.dataOffset;
      cjc.state = 'finished';
    } else {
      console.log('starting ' + cjc.header[cjc.dateIndex]);
      cjc.shuffle(cjc.data);
      cjc.changed = cjc.data.filter(row => row[cjc.dateIndex] > 0);
      if (cjc.changed.length == 0) cjc.changed = cjc.data.slice(0, 1);
    }
  }
  if (cjc.state == 'playing') {
    setTimeout(cjc.next, cjc.delay);
  } else console.log('playing has been paused or stopped');
};
cjc.play = function() {
  cjc.init();
  cjc.state = 'playing';
  setTimeout(cjc.next, cjc.delay);
};
window.addEventListener('load', function() {
  let title = null, pathIds = new Set(), fipsList = new Set();
  cjc.svgDoc = document.querySelector('object').getSVGDocument();
  cjc.svg = cjc.svgDoc.getElementById('svg9559');
  const paths = cjc.svgDoc.getElementsByTagName('path');
  cjc.defaultColor = paths[0].style.fill;
  for (let i = 0; i < paths.length; i++) {
    let node = paths[i];
    if (cjc.mapping[node.id]) {
      let newinfo = cjc.mapping[node.id];
      node.setAttribute('inkscape:label', newinfo.label);
      node.id = newinfo.id;
    }
    pathIds.add(node.id);  // build set of ids to compare with Covid* arrays
    let title = node.id + ': ' + node.getAttribute('inkscape:label');
    // for Firefox, setAttribute; for Chrome, add a <title> element
    // actually, neither seems to work on either browser
    node.setAttribute(
      'title',
      node.id + ': ' + node.getAttribute('inkscape:label')
    );
    cjc.paths[node.id] = node;
  }
  for (let i = 0; i < cjc.data.length; i++) {
    fipsList.add(cjc.data[i][0]);
  }
  console.log('svg:', cjc.svgDoc);
  console.log('fipsList: ', fipsList);
  console.log('pathIds:', pathIds);
  console.log('fipsList - pathIds: ', cjc.difference(fipsList, pathIds));
  console.log('pathIds - fipsList: ', cjc.difference(pathIds, fipsList));
  cjc.date = document.getElementById('map-date');
  cjc.area = document.getElementById('map-area');
  document.getElementById('map-start').addEventListener('click', cjc.play);
});
console.log('heatmap.js loaded');
/* vim: set tabstop=8 expandtab shiftwidth=2 softtabstop=2: */
