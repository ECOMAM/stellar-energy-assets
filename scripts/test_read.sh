#!/bin/bash
source ~/.cargo/env
stellar contract invoke \
  --id CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3 \
  --source-account niko_deployer \
  --network testnet \
  -- get_project \
  --project_id 1
