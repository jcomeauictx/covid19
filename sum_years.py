#!/usr/bin/python3
'''
Sum years to date from Javascript files
'''
import sys, os, re, logging

logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

def sum_years(jsfile, year0, year1, cutoff=None):
    '''
    Expecting two lines in the format 'const variable = [x, y, z ...];'

    Where first is the legend and the second is the data
    '''
    null = None  # for reading Javascript as Python
    with open(jsfile) as infile:
        javascript = infile.readlines()
    legend = eval(re.search(r'\[.*\]', javascript[0]).group())
    data = eval(re.search(r'\[.*\]', javascript[1]).group())
    index0 = legend.index(year0)
    index1 = legend.index(year1)
    cutoffs = [data[n][0] for n in range(len(data))]
    year1 = [data[n][index1 + 1] for n in range(len(data))]
    if cutoff is None:
        year1 = year1[:year1.index(None)]
        cutoff = data[len(year1) - 1][0]
    else:
        cutoff = ' {}'.format(cutoff)
        year1 = year1[:cutoffs.index(cutoff) + 1]
    year0 = [data[n][index0 + 1] for n in range(len(year1))]
    logging.debug('year0: %s, year1: %s', year0, year1)
    sums = sum(year0), sum(year1)
    ratio = sums[1] / sums[0]
    return sums +  (ratio, 'through week {}'.format(cutoff.strip()))

if __name__ == '__main__':
    print(sum_years(*sys.argv[1:]))
