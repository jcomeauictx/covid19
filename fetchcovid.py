#!/usr/bin/python3 -OO
'''
Get contents of <table id="weekTable"> from //cdc.gov/nchs/nvss/vsrr/COVID19/
'''
import sys, os, logging, csv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.common.exceptions import InvalidArgumentException
logging.basicConfig(level=logging.DEBUG if __debug__ else logging.INFO)

BROWSER = webdriver.Firefox()
WAIT_TIME = 60  # seconds to wait until giving up finding element
WEBSITE = os.getenv('WEBSITE') or 'https://www.cdc.gov/nchs/nvss/vsrr/COVID19/'

def fetchcovid(url, table_id='weekTable', outfile=sys.stdout):
    try:
        BROWSER.implicitly_wait(10)
    except InvalidArgumentException as error:
        logging.debug('Cannot implictly wait: %s', error)
    BROWSER.get(url)
    table_id = table_id or 'weekTable'  # in case passed as '' from commandline
    table = BROWSER.find_element_by_id(table_id)
    logging.debug('table: %s', table)
    rows = table.find_elements_by_tag_name('tr')
    logging.debug('rows: %s', rows)
    data = [[' '.join(element.text.strip().split()) for element in
            row.find_elements_by_css_selector('th,td')]
            for row in rows]
    logging.debug('data: %s', data)
    if not hasattr(outfile, 'write'):
        outfile = open(outfile, 'w', encoding='utf8')
    csvout = csv.writer(outfile, delimiter='\t')
    csvout.writerows(data)
    BROWSER.quit()

if __name__ == '__main__':
    fetchcovid(*(sys.argv[1:] or [WEBSITE]))
