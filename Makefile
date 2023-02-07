include config.mk

HOMEDIR = $(shell pwd)
rollup = ./node_modules/.bin/rollup

deploy:
	npm version patch && make build && git commit -a -m"Build" && make pushall

pushall: sync
	git push origin main

run:
	$(rollup) -c -w

build:
	$(rollup) -c

sync:
	rsync -a $(HOMEDIR)/samples $(USER)@$(SERVER):/$(APPDIR)/
	scp $(HOMEDIR)/app.css $(USER)@$(SERVER):/$(APPDIR)
	scp $(HOMEDIR)/index.html $(USER)@$(SERVER):/$(APPDIR)
	scp $(HOMEDIR)/index.js $(USER)@$(SERVER):/$(APPDIR)

set-up-server-dir:
	ssh $(USER)@$(SERVER) "mkdir -p $(APPDIR)"

get-biscayne-tides:
	wget "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=NOS.COOPS.TAC.WL&begin_date=20221007&end_date=20221107&datum=MLLW&station=8723214&time_zone=GMT&units=english&format=json" -O data/biscayne-tides.json
