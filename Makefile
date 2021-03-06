SHELL := /bin/bash
WEBSITE := https://www.cdc.gov/nchs/nvss/vsrr/COVID19/index.htm
FLUVIEW := https://gis.cdc.gov/grasp/fluview/mortality.html
DELETE ?= --delete
DRYRUN ?= --dry-run
BACKUP ?= backup3
USADATA ?= https://usafactsstatic.blob.core.windows.net
USAFACTS := covid_deaths_usafacts.csv covid_confirmed_usafacts.csv \
	covid_county_population_usafacts.csv covid_test_usafacts.csv
USA_JS := $(USAFACTS:.csv=.js)
USERAGENT := Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)
U := --user-agent="$(USERAGENT)"
QUIET ?= -q  # for wget, `make QUIET= covid_*.csv` to view progress
# run Selenium Webdriver headless when set
MOZ_HEADLESS ?= 1
export
all: $(USA_JS) fludata.js cdcdata.js
cdcdata.js: importtsv.py cdcdata.tsv
	./$+ $@
fludata.js: importdata2.py merged.csv
	./$+ $@
oldflu.js: importdata2.py fludata.csv
	./$+ $@
upload:
	$(MAKE) BACKUP=backup1 upload_one
	$(MAKE) BACKUP=backup2 upload_one
	$(MAKE) BACKUP=backup3 upload_one
upload_one:
	rsync -avuz $(DRYRUN) \
	 $(DELETE) \
	 *.html \
	 *.js \
	 chart.css \
	 cdcdata.* \
	 fludata.* \
	 .htaccess \
	 Makefile \
	 *.py \
	 merged.csv \
	 heatmap.* \
	 counties.* \
	 covid_* \
	 $(BACKUP):/var/www/jcomeau/covid19/
download:
	rsync -avuz \
	 $(DRYRUN) \
	 --exclude '__pycache__' \
	 --exclude 'geckodriver.log' \
	 $(BACKUP):/var/www/jcomeau/covid19/ .
python:
	python3
.FORCE:
pylint:
	pylint3 *.py
cdcdata.tsv: fetchcovid.py
	./$< $(WEBSITE) '' $@.tmp
	# first check if non-empty, then if updated.
	# if both are true, make this the new tsv file.
	# otherwise, delete the new file or move to /tmp/.
	if [ -s $@.tmp ]; then \
	 if cmp -s $@.tmp $@; then \
	  mv -f $@.tmp /tmp/; \
	 else \
	  mv -f $@.tmp $@; echo $@ updated >&2; \
	 fi; \
	else \
	 mv -f $@.tmp /tmp/; \
	fi
	touch $@  # update timestamp to avoid remake even if files were same
fludata.csv: fetchflu.py
	./$< $(FLUVIEW)
	# if data is updated, make this the new fludata.csv.
	# otherwise, delete 'National_Custom_Data*.csv' or move to /tmp/.
	if cmp -s National*Custom*Data*.csv $@; then \
	 mv -f National*Custom*Data*.csv /tmp/; \
	else \
	 mv -f National*Custom*Data*.csv $@; echo $@ updated >&2; \
	fi
	touch $@  # update timestamp to avoid remake even if files were same
merged.csv: mergedata.py fludata.csv cdcdata.tsv
	./$+ $@.tmp
	if cmp -s $@.tmp $@; then \
	 rm -f $@.tmp; \
	else \
	 mv -f $@.tmp $@; echo $@ updated >&2; \
	fi
%.sum:	%
	./sum_years.py $< 2017-18 2019-20
sum:	oldflu.js.sum
%.js:	csvtojs.py %.csv
	./$+
covid_%.csv: .FORCE
	# on some machines, usadata always returns that the file has not
	# been updated even though it has. so we have to defeat that.
	#touch -m -t 200001010000 $@
	wget $(U) -q -c -N $(QUIET) $(USADATA)/public/data/covid-19/$@ || true
.PRECIOUS: $(USAFACTS)
shell:
	@echo Dropping you into a subshell. ^D to exit. >&2
	bash -l
env:
	$@
