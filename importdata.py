#!/usr/bin/python3
'''
Import Coronavirus data from CDC

GPL copyleft jc@unternet.net
'''

import sys, os, csv, re, datetime, logging  # pylint: disable=multiple-imports

logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

HEADERS = [
    'Data as of',
    'Group',
    'State',
    'Indicator',
    'Start week',
    'End week',
    'All COVID-19 Deaths (U07.1)',
    'Deaths from All Causes',
    'Percent of Expected Deaths',
    'All Pneumonia Deaths (J12.0-J18.9)',
    'Deaths with Pneumonia and COVID-19 (J12.0-J18.9 and U07.1)',
    'All Influenza Deaths (J09-J11)',
    'Pneumonia, Influenza, and COVID-19 Deaths',
    'Footnote',
]
GROUP = 'By week'
TOTAL = 'Total Deaths'
WANTED = [
    'End week',
    'All COVID-19 Deaths (U07.1)',
    'Deaths from All Causes',
    'Percent of Expected Deaths',
]

class Date(datetime.datetime):
    '''
    Just wrap a datetime object so printing it yields Javascript
    '''
    def __str__(self):
        return 'new Date({}, {}, {})'.format(
            self.year, self.month - 1, self.day)
    __repr__ = __str__

def dataimport(rawdata):
    '''
    Process poorly formatted CSV data from CDC
    '''
    if not isinstance(rawdata, list) and os.path.exists(rawdata):
        with open(rawdata, encoding='utf8') as infile:
            rawdata = infile.readlines()
    csvin = csv.reader(rawdata)
    rows = [row for row in csvin]
    headers = rows.pop(0)
    if headers != HEADERS:
        raise ValueError('Mismatching headers in new CVC data {} vs. {}'.format(
            headers, HEADERS))
    selected = [dict(zip(headers, row)) for row in rows if row[1] == GROUP
                and row[3] != TOTAL]
    cleaned = [[numberclean(row, item) for item in WANTED] for row in selected]
    return cleaned

def numberclean(data, name):
    '''
    Render the CDC numbers into something parseable by Javascript
    '''
    item = data[name]
    if re.match('^Percent', name):
        item = int(round(100 * float(item)))
    elif re.match('.*Deaths', name):
        item = int(item.replace(',', ''))
    elif re.match('^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$', item):
        item = Date.strptime(item, '%m/%d/%Y')
    return item

def convert(csvname, jsname):
    '''
    Get valid Javascript from CSV data
    '''
    if not hasattr(jsname, 'write'):
        jsname = open(jsname, 'w')
    print('const cdcData = {};'.format(dataimport(csvname)), file=jsname)

if __name__ == '__main__':
    sys.argv.append(sys.stdout)  # in case outfile not specified
    if len(sys.argv) >= 3:
        # pylint: disable=unbalanced-tuple-unpacking
        COMMAND, CSVNAME, JSNAME = sys.argv[:3]
        convert(CSVNAME, JSNAME)
    else:
        print('Usage: {} CSVNAME, JSNAME'.format(sys.argv[0]),
              file=sys.stderr)
