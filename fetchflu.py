#!/usr/bin/python3 -OO
'''
Get contents of <table id="weekTable"> from //cdc.gov/nchs/nvss/vsrr/COVID19/
'''
import sys, os, logging, csv, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions
from selenium.common.exceptions import InvalidArgumentException, \
        TimeoutException, WebDriverException, ElementClickInterceptedException
from selenium.webdriver.common.keys import Keys
logging.basicConfig(level=logging.INFO if __debug__ else logging.WARNING)
# https://stackoverflow.com/a/7983487/493161
PROFILE = webdriver.FirefoxProfile()
# folderList: 0=Desktop, 1=Downloads, 2=As specified or last used
PROFILE.set_preference('browser.download.folderList', 2)
# Download to this very directory
PROFILE.set_preference('browser.download.dir', os.getcwd())
# Never ask for this mimetype
PROFILE.set_preference('browser.helperApps.neverAsk.saveToDisk', 'text/plain')
FLUVIEW = 'https://gis.cdc.gov/grasp/fluview/mortality.html'
BROWSER = webdriver.Firefox(firefox_profile=PROFILE)
WAIT_TIME = 60  # seconds to wait until giving up finding element
WEBSITE = os.getenv('FLUVIEW') or FLUVIEW

def fetchflu(url):
    try:
        try:
            BROWSER.implicitly_wait(30)
            can_implicitly_wait = True
        except InvalidArgumentException as error:
            can_implicitly_wait = False
            logging.info('Cannot implictly wait: %s', error)
        BROWSER.get(url)
        click('button[ng-click="confirm(2)"]')
        click('//button/text()[contains(., "Downloads")]/..', 'xpath')
        click('//text()[contains(., "Custom Data")]/../input', 'xpath')
        click('//label/text()[contains(., "Surveillance Area:")]/'
              '../following-sibling::div/button',
              'xpath')
        click('//a/text()[contains(., "National")]/..', 'xpath')
        click('//input[@ng-model="isAllSeasons"]', 'xpath')
        click('//button/text()[contains(., "Download Data")]/..', 'xpath')
        time.sleep(1)
    finally:
        BROWSER.quit()

def click(selector, selector_type='css_selector'):
    '''
    Wait for element to be clickable, and click it.
    '''
    oops = None
    for attempt in range(10):
        logging.info("finding '%s' by '%s'", selector, selector_type)
        element = WebDriverWait(BROWSER, 10).until(
            expected_conditions.element_to_be_clickable(
                (getattr(By, selector_type.upper()), selector)
            )
        )
        logging.info('clicking %s "%s", attempt %d',
                     element.tag_name, element.text, attempt)
        try:
            element.click()
            return
        except ElementClickInterceptedException as oops:
            logging.info('failed click: %s', oops)
    raise oops

if __name__ == '__main__':
    fetchflu(*(sys.argv[1:] or [WEBSITE]))
