#!/usr/bin/python3 -OO
'''
Merge the daily-updated data from the covid19 page to that from the
mortality page, which gets updated less often.

One problem is to convert the month/day/year format to the "week of flu season"
number.  Week 16 is the week ending April 18, 2020.
'''
import sys, os, csv, re, logging
from datetime import datetime, timedelta
from importdata2 import HEADERS as CSVHEADERS
from importtsv import HEADERS as TSVHEADERS
logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

WEEK = timedelta(days=7)
WEEK16 = datetime(year=2020, month=4, day=18)
WEEKHEADER = 'Week ending date in which the death occurred'
TSVDEATHS = 'Deaths from All Causes'
TSVPERCENT = 'Percent of Expected Deaths2'
CSVDEATHS = 'TOTAL DEATHS'
CSVPERCENT = 'PERCENT COMPLETE'

def tsvread(tsvfile):
    '''
    Read in a TSV file.
    '''
    with open(tsvfile, 'r') as infile:
        tsvin = csv.reader(infile, delimiter='\t')
        rows = [row for row in tsvin]
    headers = rows.pop(0)
    tsvdata = [dict(zip(headers, row)) for row in rows]
    return tsvdata

def csvread(csvfile):
    '''
    Read in a CSV file.
    '''
    with open(csvfile, 'r') as infile:
        csvin = csv.reader(infile)
        rows = [row for row in csvin]
    headers = rows.pop(0)
    csvdata = [dict(zip(headers, row)) for row in rows]
    return csvdata

def double(number):
    '''
    Get rid of spurious characters and turn numeric string to a float
    '''
    return float(re.compile('[0-9,.]+').search(number).group().replace(',', ''))

def greater(csvrow, tsvrow):
    '''
    Return csvrow with greater deaths number from two rows.
    
    Side effect: csvrow is already mutated with updated values.

    Note: The percentage in the `fluview` CSV file is different from that in
    the TSV data from NCHS: the former is the "percent complete" and the
    latter "expected deaths". So while it *may* be valid to multiply by the
    inverse of the percentage in the previous case, it is dubious in the
    latter. So we will mark it as being 100% complete to avoid misleading
    numbers.
    '''
    csvdeaths = double(csvrow[CSVDEATHS])
    csvpercent = double(csvrow[CSVPERCENT])
    tsvdeaths = double(tsvrow[TSVDEATHS])
    tsvpercent = double(tsvrow[TSVPERCENT])
    csvvalue = (csvdeaths if csvpercent >= 100
                else csvdeaths * (100 / csvpercent))
    if tsvdeaths > csvvalue:
        logging.debug('replacing %s with %s', csvvalue, tsvdeaths)
        csvrow[CSVDEATHS] = tsvrow[TSVDEATHS]
        csvrow[CSVPERCENT] = '100%'
    return csvrow  # just for debugging; the dict has already been mutated

def merge(csvfile, tsvfile, mergedfile):
    '''
    Put highest number from TSV and CSV data into merged CSV file.
    '''
    csvdata = csvread(csvfile)
    tsvdata = tsvread(tsvfile)
    mapping = {'16': WEEK16}
    for week in range(1, 16):
        mapping[str(week)] = WEEK16 - (WEEK * (16 - week))
    for week in range(17, 40):
        mapping[str(week)] = WEEK16 + (WEEK * (week - 16))
    logging.debug('mapping: %s', mapping)
    tsvdict = {datetime.strptime(row[WEEKHEADER], '%m/%d/%Y'): row
               for row in tsvdata if row[WEEKHEADER] != 'Total Deaths'}
    csvdict = {mapping[row['WEEK']]: row for row in csvdata
               if row['AREA'] == 'National' and row['SEASON'] == '2019-20'
               and int(row['WEEK']) < 40}
    for week, row in csvdict.items():
        if week in tsvdict:
            row.update(greater(row, tsvdict[week]))
    with open(mergedfile, 'w') as outfile:
        csvout = csv.writer(outfile)
        csvout.writerows([CSVHEADERS] + [[row[header] for header in CSVHEADERS]
                         for row in csvdata])

if __name__ == '__main__':
    merge(*sys.argv[1:])
