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
cjc.selection = null;
cjc.selected = null;
cjc.algorithm = null;
cjc.smoothing = null;
cjc.scaling = null;
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
cjc.color = null;  // algorithm to use when coloring
cjc.delay = 1; // ms between iterations
cjc.dataMax = 0;
cjc.dataMin = 0;
cjc.gradient = [];
//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
cjc.difference = function(set0, set1) {
  let difference = new Set(set0)
  for (let element of set1) {
    difference.delete(element)
  }
  return difference
}
cjc.rgbcolor = function(string) {
  return string.replace(/[^\d,]/g, '').split(',');
}
cjc.rgbstring = function(array) {
  return 'rgb(' + array[0] + ',' + array[1] + ',' + array[2] + ')';
}
// initialize color gradient, most negative=blue, going to cyan
// zero is green, going through yellow to red
for (let red = 0, green = 0, blue = 255; green < 256; green++) {
  cjc.gradient.push(cjc.rgbstring([red, green, blue]));
}
for (let red = 0, green = 255, blue = 254; blue >= 0; blue--) {
  cjc.gradient.push(cjc.rgbstring([red, green, blue]));
}
for (let red = 1, green = 255, blue = 0; red < 256; red++) {
  cjc.gradient.push(cjc.rgbstring([red, green, blue]));
}
for (let red = 255, green = 254, blue = 0; green >= 0; green--) {
  cjc.gradient.push(cjc.rgbstring([red, green, blue]));
}
cjc.shuffle = function(array) {
  array.sort(() => Math.random() - 0.5);
}
cjc.mapping = {
  '46113': {id: '46102', label: 'Oglala Lakota, SD'}
};
cjc.debug = function(key) {
  if (cjc.debugging && (cjc.debugging == true || key == cjc.debugging)) {
    console.log(...Array.from(arguments).slice(1));
  }
};
cjc.sum = function(accumulator, value) {
  return accumulator + value;
};
cjc.min = function(accumulator, value) {
  return Math.min(accumulator, value);
};
cjc.max = function(accumulator, value) {
  return Math.max(accumulator, value);
};
cjc.cleanup = function(data) {
  console.log("length of data before cleanup " + data.length);
  const cleaned = data.filter(function(row) {return cjc.paths[row[0]]});
  console.log("length of data after cleanup " + cleaned.length);
  for (let i = 0; i < cleaned.length; i++) {
    const row = cleaned[i];
    for (let j = row.length - 1; j > cjc.dataOffset; j--) {
      if (row[j - 1] > row[j]) {
        cjc.debug('cleanup', 'fixing bad datum ' + row[j - 1] + ' in ' +
          JSON.stringify(row.slice(0, j + 5)));
        row[j - 1] = row[j];
      }
    }
  }
  return cleaned;
};
cjc.init = function() {
  cjc.selection = document.getElementById('data-file');
  cjc.selected = cjc.selection[cjc.selection.selectedIndex].value;
  cjc.algorithm = document.getElementById('data-algorithm');
  cjc.color = cjc[cjc.algorithm[cjc.algorithm.selectedIndex].value];
  cjc.smoothing = document.getElementById('data-smoothing');
  cjc.scaling = document.getElementById('data-scaling');
  if (cjc.selected == 'CovidTestUsafacts') cjc.delay = 1000;
  cjc.header = cjc[cjc.selected][0];
  cjc.data = cjc[cjc.selected].slice(1);
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
  cjc.data = cjc.cleanup(cjc.data);
  cjc.smoothData(parseInt(cjc.smoothing[cjc.smoothing.selectedIndex].value));
  cjc.scaleData(cjc.scaling[cjc.scaling.selectedIndex].value == "true");
  cjc.differentiate(["total", "speed", "acceleration"].indexOf(
    cjc.algorithm[cjc.algorithm.selectedIndex].value));
  cjc.color(null, true);  // run initialization for color algorithm
  cjc.dateIndex = cjc.dataOffset;
  cjc.countyIndex = 0;
  cjc.shuffle(cjc.data);
  cjc.changed = cjc.data.filter(row => row[cjc.dateIndex] > 0);
  if (cjc.changed.length == 0) cjc.changed = cjc.data.slice(0, 1);
};
cjc.smoothData = function(days) {
  if (days == 0) return;
  for (let i = 0; i < cjc.data.length; i++) {
    cjc.movingAverage(cjc.data[i], days);
  }
};
cjc.scaleData = function(choice) {
  if (choice) {
    for (let i = 0; i < cjc.data.length; i++) {
      cjc.byPopulation(cjc.data[i]);
    }
  }
};
cjc.differentiate = function(number) {
  if (number > 0) {
    console.log('differentiating ' + number + ' times')
    for (let i = 0; i < number; i++) {
      for (let j = 0; j < cjc.data.length; j++) {
        cjc.differential(cjc.data[j], i);
      }
    }
  } else {
    console.log('not differentiating, number=' + number);
  }
};
cjc.debugNext = function() {
  // call this from console
  cjc.init();
  savedDebugging = cjc.debugging;
  cjc.debugging = true;
  cjc.next();
  cjc.debugging = savedDebugging;
};
cjc.naive = function(path, init) {
  // this was my first, unscientific, stab at a "heat" plot
  if (init) return;  // this does not use an initialization routine
  cjc.area.value = path.getAttribute('title');
  let red = 0, green = 0, blue = 0;
  let color = path.style.fill;
  let lastCount = parseFloat(path.getAttribute('data-count')) || 0;
  let weight = parseFloat(path.getAttribute('data-weight')) || -1;
  let count = cjc.changed[cjc.countyIndex][cjc.dateIndex];
  cjc.debug('color', 'color', color, 'weight', weight, 'count', count,
            'lastCount', lastCount);
  if (count > lastCount) {
    cjc.debug(true, path.getAttribute('title') + ' count ' + count +
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
};
cjc.speed = function(path, init) {
  if (init) {
    let max = 0, min = 0;
    for (let i = 0; i < cjc.data.length; i++) {
      max = Math.max(max, cjc.data[i].slice(cjc.dataOffset).reduce(cjc.max));
      min = Math.min(min, cjc.data[i].slice(cjc.dataOffset).reduce(cjc.min));
      if (['speed.init', true].includes(cjc.debugging)) {
        if (cjc.dataMax < max) {
          cjc.debug('speed.init', 'replacing cjc.dataMax with ' + max +
            ' from ' + cjc.data[i][0]);
          cjc.dataMax = max;
        }
        if (cjc.dataMin > min) {
          cjc.debug('speed.init', 'replacing cjc.dataMin with ' + min +
            ' from ' + cjc.data[i][0]);
          cjc.dataMin = min;
        }
      }
    }
    cjc.debug('speed.init', 'max: ' + max + ', min: ' + min);
    cjc.dataMax = max;
    cjc.dataMin = min;
    return;
  }
  let number = cjc.changed[cjc.countyIndex][cjc.dateIndex];
  cjc.area.value = path.getAttribute('title');
  // scale the number to fit color gradient
  // this will only work reliably with an odd number of colors
  let halfway = Math.floor(cjc.gradient.length / 2);
  let scaled = null;
  if (number < 0) {
    scaled = -halfway + Math.floor((number * halfway) / cjc.dataMin);
  } else {
    scaled = halfway + Math.floor((number * halfway) / cjc.dataMax);
  }
  cjc.debug('speed', 'number: ' + number + ', scaled: ' + scaled);
  path.style.fill = cjc.gradient[scaled];
  cjc.debug('speed', 'colored path ' + path.id + ' ' + cjc.gradient[scaled]);
};
cjc.total = cjc.speed;
cjc.acceleration = cjc.speed;
cjc.differential = function(row, pass) {
  cjc.debug('differential', 'running differential on row', row);
  for (let i = cjc.dataOffset; i < row.length - 1; i++) {
    row[i] = row[i + 1] - row[i];
    if (pass == 0 && row[i] < 0) {
      throw "negative number found in " + JSON.stringify(row);
    }
  }
  row[row.length - 1] = row[row.length - 2];  // copy final value
  cjc.debug('differential', 'after differential on row', row);
};
cjc.movingAverage = function(row, days) {
  for (let i = row.length - 1; i > cjc.dataOffset; i--) {
    sample = row.slice(Math.max(cjc.dataOffset, i - days), i);
    cjc.debug('average', 'sample', sample);
    row[i] = sample.reduce(cjc.sum) / sample.length;
  }
};
cjc.population = function(row) {
  const key = row[0];
  cjc.debug('population', 'row', row, 'key=' + key);
  const found = cjc.CovidCountyPopulationUsafacts
    .filter(function(row) {return row[0] == key;});
  if (found.length == 0) {
    // should *not* happen for county
    console.log("No population data for county " + key);
    return undefined;
  } else return found[0][3];
};
cjc.byPopulation = function(row) {
  let population = cjc.population(row);
  if (!population) population = 1000000000;  // extremely large number
  for (let i = row.length - 1; i >= cjc.dataOffset; i--) {
    row[i] = row[i] / population;
  }
};
cjc.next = function() {
  let path = null;
  let countyFips = cjc.changed[cjc.countyIndex][0];
  let date = cjc.header[cjc.dateIndex];
  cjc.date.value = date;
  cjc.debug(true, 'plotting county ', countyFips, 'date', date);
  try {
    path = cjc.paths[countyFips];
  } catch (error) {
    cjc.debug(true, 'null path for id ' + countyFips, error);
  }
  if (path != null) {
    cjc.color(path);
  } else {
    cjc.debug(true, 'key ' + countyFips + ' has no matching <path>');
  }
  cjc.countyIndex++;
  if (cjc.countyIndex == cjc.changed.length) {
    cjc.countyIndex = 0;
    cjc.dateIndex++;
    if (cjc.dateIndex == cjc.header.length) {
      cjc.dateIndex = cjc.dataOffset;
      cjc.state = 'finished';
    } else {
      cjc.debug(true, 'starting ' + cjc.header[cjc.dateIndex]);
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
