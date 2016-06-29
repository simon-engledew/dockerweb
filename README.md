## About

This is a proof-of-concept for attaching a web-based terminal to a running Docker container.

![jun-29-2016 08-43-42](https://cloud.githubusercontent.com/assets/14410/16444393/ae5a07ae-3dd5-11e6-87ae-f29f2716689e.gif)

You'll need Docker installed and running, probably on a Linux or Mac machine (– tested with Docker Version 1.12.0-rc2-beta16). 

An express app will start, connect to Docker on `/var/run/docker.sock` and build a minimal Alpine linux image.

Visiting `http://localhost:3000/` will spin up a new Docker container and connect your browser to it. Type away!

## Installation

Using node 6.2+:

```
npm install
node index.js
open http://localhost:3000/docker
```
