#!/usr/bin/python3 -OO
'''
Convert CSV files from usafacts.org into JavaScript
'''
import sys, os, logging, csv, re
from datetime import datetime
logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

class Date(datetime):
    '''
    Just wrap a datetime object so printing it yields Javascript
    '''
    def __new__(this, timestamp):
        '''
        Override datetime.datetime.__new__
        '''
        new = datetime.strptime(timestamp, '%m/%d/%y')
        logging.debug('new Date: %s', new)
        return datetime.__new__(this, new.year, new.month, new.day)

    def __str__(self):
        '''
        JavaScript compatible representation
        '''
        return 'new Date({}, {}, {})'.format(
            self.year, self.month - 1, self.day)
    __repr__ = __str__

def convert(filename):
    '''
    Convert usafacts CSV file to JavaScript
    '''
    with open(filename) as infile:
        rawdata = infile.read()
    if rawdata[0] == '\ufeff':
        rawdata = rawdata[1:]
    reader = csv.reader(rawdata.splitlines())
    data = [[javascript(row, i) for i in range(len(row))] for row in reader]
    fileroot = os.path.splitext(os.path.basename(filename))[0]
    camelcase = ''.join(map(str.capitalize, fileroot.split('_')))
    with open(fileroot + '.js', 'w') as outfile:
        print('cjc.{} = {};'.format(camelcase, data), file=outfile)

def javascript(row, index):
    '''
    Convert item string into the appropriate JavaScript type
    '''
    if index == 0 and row[index].isdigit():
        item = row[index].zfill(5)
    elif row[index].isdigit():
        item = int(row[index])
    elif re.match(r'^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$', row[index]):
        item = Date(row[index])
    else:
        item = row[index]
    return item

if __name__ == '__main__':
    convert(sys.argv[1])
