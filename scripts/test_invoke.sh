#!/bin/bash
source ~/.cargo/env
stellar contract invoke \
  --id CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3 \
  --source-account niko_deployer \
  --network testnet \
  -- create_project \
  --creator GC755Q7SO6ZHWP4FOSR52R7W624DWO7RAD6UAQ5TLTEUBXBKMJ5AVIZ6 \
  --name '"Solar Lima Miraflores"' \
  --total_supply 1000 \
  --price 100 \
  --min_purchase 10
