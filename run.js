#!/usr/bin/env node

"use strict";

require('shelljs/global');

[...Array(3).keys()].forEach(key => exec(
    `SERVICE_ID="gateway-${key}" PORT=${8081+key} MAPPED_PORT=${8081+key} HOST="localhost" REDIS_URL="redis://localhost:6379" node index.js`
  , (code, stdout, stderr) => {})
)
