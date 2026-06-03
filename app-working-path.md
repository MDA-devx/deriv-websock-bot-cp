##TRADE TAB
*load ui
*load token,api,id,time-candles,index,etc
*load default strategy(multi-m) on conbobox+adapt.+ema-x
*load indicators used
*load values of used indic.
*fill indicator values on sidebar
cant be changed
*config is hidden
*no log textbox, log is on last(new)tab
*conect button enables start clikable
*start and stop trading buttns (init on stop)

##STRATEGY TAB
*same or mirrored element for strategy selector.
**indicators
these are editable. 
*toggle and value for each
*the graph take a snapshot every 15 min, so data is used for backtest
*strategy is aplied on graph (static)[ only viewed ] showing indicators and trades triggered pull put signals
*save strat.
*load external strat
*strat descr or notes 


##ANALISIS TAB
*estrategy loaded on strat tab. can be changed locally for thus tab. doesnt change other tabs.
*parameters readonly like trade tab but with this strat parms.
*backtest (bkt) current tab strat
*bkt duration: 30m, 1h,6h,24h
*timeframe candle same as trade
*bkt save btn
*bkt load btn
just load signals on grap
*manual marks (up/down)
*manual mks analisis: find indicators similarities between mks, creates new strategy with success indic. val.
*improve actual strategy: modifing slightly enabled indicator values to get better win loose ratio, more acurate signals



##LOG - CONFIG TAB
*log
*config
