#!/usr/bin/python3
'''
Import flu data from CDC

GPL copyleft jc@unternet.net

Note the strange week numbering in National_Custom_Data*.csv from
cdc.gov/flu/weekly compared to the more readable dates on the covid-19
data. The Rosetta stone was provided by a recent cdc.gov/flu/weekly
headline, "Key Updates for Week 16, ending April 18, 2020".

So it seems week 40 of a "flu year" starts in autumn of the year before,
counts up to 52, then counts from week 1 in January to week 39 in this
year's autumn.

However, since there are only 364 days in a year of 52 7-day weeks, there
will be a "week 53" every now and then. That occurred in the 2014-15 season,
in this data set. There are at least 3 logical ways to deal with it, that I
can see: ignore it; distribute it evenly over 7 years; or do as I. Ratel
did and show a 53-week year, with week 53 in the week 1 slot and bumping
all the rest over to the right.

See //accordingtohoyt.com/2020/03/27/covid-19-and-us-mortality-by-i-ratel/

Since I can't do, with a multi-year graph, what I did with the Covid-19 data
chart, showing the percentage as an additional line on the chart (because I
would need one for each year). So I see two rational choices: ignore it,
as Ratel apparently did, or I believe better, multiply the current count by the
inverse of the percentage, assuming the data yet to come in will be similar.
'''

import sys, os, csv, re, logging  # pylint: disable=multiple-imports
from collections import defaultdict

logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

class Null():  # pylint: disable=too-few-public-methods
    '''
    represent Javascript null
    '''
    def __repr__(self):
        'Javascript null'
        return 'null'
    __str__ = __repr__

NULL = Null()

HEADERS = [
    'AREA',
    'SUB AREA',
    'AGE GROUP',
    'SEASON',
    'WEEK',
    'THRESHOLD',
    'BASELINE',
    'PERCENT P&I',
    'NUM INFLUENZA DEATHS',
    'NUM PNEUMONIA DEATHS',
    'TOTAL DEATHS',
    'PERCENT COMPLETE'
]
WANTED = [
    'SEASON',
    'WEEK',
    'TOTAL DEATHS',
    'PERCENT COMPLETE'
]
CHOSEN = ['National', '', 'All']  # all rows should match
WEEKS = list(range(40, 53)) + list(range(1, 40))  # 40-52, 1-39 as explained

def dataimport(rawdata):
    '''
    Process poorly formatted CSV data from CDC
    '''
    if not isinstance(rawdata, list) and os.path.exists(rawdata):
        with open(rawdata) as infile:
            rawdata = infile.readlines()
    csvin = csv.reader(rawdata)
    rows = [row for row in csvin]
    headers = rows.pop(0)
    if headers != HEADERS:
        raise ValueError('Mismatching headers in new CVC data {} vs. {}'.format(
            headers, HEADERS))
    selected = [dict(zip(headers, row)) for row in rows if row[:3] == CHOSEN]
    if not selected:
        raise ValueError('No data matching {}, found {}'.
                         format(CHOSEN, rows[0][:3]))
    cleaned = [[numberclean(row, item) for item in WANTED] for row in selected]
    return cleaned

def numberclean(data, name):
    '''
    Render the CDC numbers into something parseable by Javascript
    '''
    item = data[name]
    if re.match('^PERCENT', name):
        try:
            item = float(re.match('^[^0-9.]*([0-9.]+)%$', data[name]).group(1))
        except (AttributeError, IndexError):
            raise TypeError('Unexpected percent {}'.format(data[name]))
    elif re.match('.*DEATH', name):
        item = int(item.replace(',', ''))
    elif name == 'WEEK':
        item = int(item)
    return item

def convert(infile, outfile):
    '''
    Convert CSV data to JavaScript
    '''
    cleaned = dataimport(infile)
    weeks = defaultdict(list)
    seasons = defaultdict(list)
    for season, week, deaths, percent in cleaned:
        if percent < 100:
            # incomplete data should probably be corrected somehow
            deaths *= (100.0 / percent)
        if week != 53:  # this is a known problem, ignore it for now
            weeks[season].append(week)
        if weeks[season] != WEEKS[:len(weeks[season])]:
            raise ValueError('Week out of order: {}'.format(weeks[season]))
        seasons[season].append(deaths)
    legend = sorted(seasons)
    # pad out missing data
    for season in legend:
        seasons[season].extend([NULL] * (53 - len(seasons[season])))
    fludata = [[getweek(index)] + [seasons[season][index] for season in legend]
               for index in range(53)]
    if not hasattr(outfile, 'write'):
        outfile = open(outfile, 'w')
    print('const legend = {};'.format(legend), file=outfile)
    print('const fluData = {};'.format(fludata), file=outfile)

def getweek(index):
    '''
    Return week as a string that Google charts will sort into correct order
    '''
    formatted = None
    try:
        week = WEEKS[index]  # works on 1-52
        formatted = '% 2d' % week
    except IndexError:
        formatted = ' '
    return formatted

if __name__ == '__main__':
    sys.argv.append(sys.stdout)  # in case output file wasn't specified
    if len(sys.argv) >= 3:
        # pylint: disable=unbalanced-tuple-unpacking
        COMMAND, CSVNAME, JSNAME = sys.argv[:3]
        convert(CSVNAME, JSNAME)
    else:
        print('Usage: {} CSVNAME, JSNAME'.format(sys.argv[0]),
              file=sys.stderr)
