#!/usr/bin/python3
'''
Import Coronavirus data from CDC

GPL copyleft jc@unternet.net

The CDC stopped providing a CSV file as of May 1st, 2020. Now they have a
Javascript-generated HTML table, which when highlighted and pasted, reveals
a TSV (tab separated values) format.

The website source is https://www.cdc.gov/nchs/nvss/vsrr/COVID19/index.htm
'''
import sys, os, csv, re, datetime, logging  # pylint: disable=multiple-imports

logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

HEADERS = [
    'Week ending date in which the death occurred',
    'All Deaths involving COVID-19 (U07.1)1',
    'Deaths from All Causes',
    'Percent of Expected Deaths2',
    'Deaths involving Pneumonia, with or without COVID-19,'
        ' excluding Influenza deaths (J12.0–J18.9)3'
    'Deaths involving COVID-19 and Pneumonia, excluding Influenza'
        ' (U07.1 and J12.0–J18.9)3',
    'All Deaths involving Influenza, with or without COVID-19 or Pneumonia'
        ' (J09–J11), includes COVID-19 or Pneumonia4',
    'Deaths involving Pneumonia, Influenza, or COVID-19 (U07.1 or J09–J18.9)5'
]
WANTED = [
    'Week ending date in which the death occurred',
    'COVID-19 Deaths (U07.1)1',
    'Deaths from All Causes',
    'Percent of Expected Deaths2',
]
TOTAL = 'Total Deaths'

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
    Process poorly formatted TSV data from CDC
    '''
    if not isinstance(rawdata, list) and os.path.exists(rawdata):
        with open(rawdata, encoding='utf8') as infile:
            rawdata = infile.readlines()
    tsvin = csv.reader(rawdata, delimiter='\t')
    rows = [row for row in tsvin]
    headers = rows.pop(0)
    if headers != HEADERS:
        raise ValueError('Headers have changed: %s not the same as %s' %
                         (headers, HEADERS))
    selected = [dict(zip(headers, row)) for row in rows if row[0] != TOTAL]
    cleaned = [[numberclean(row, item) for item in WANTED] for row in selected]
    return cleaned

def numberclean(data, name):
    '''
    Render the CDC numbers into something parseable by Javascript
    '''
    item = data[name]
    if re.match('^Percent', name):
        item = int(round(float(item)))
    elif re.match('.*Deaths', name):
        item = int(item.replace(',', ''))
    elif re.match('^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$', item):
        item = Date.strptime(item, '%m/%d/%Y')
    return item

def convert(tsvname, jsname):
    '''
    Get valid Javascript from TSV data
    '''
    if not hasattr(jsname, 'write'):
        jsname = open(jsname, 'w')
    print('const cdcData = {};'.format(dataimport(tsvname)), file=jsname)

if __name__ == '__main__':
    sys.argv.append(sys.stdout)  # in case outfile not specified
    if len(sys.argv) >= 3:
        # pylint: disable=unbalanced-tuple-unpacking
        COMMAND, TSVNAME, JSNAME = sys.argv[:3]
        convert(TSVNAME, JSNAME)
    else:
        print('Usage: {} TSVNAME, JSNAME'.format(sys.argv[0]),
              file=sys.stderr)
