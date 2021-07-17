# Clase-29: Modulo Cluster

#### process info: '/getInfo' (includes core number)

## PM2
start server in a custom PORT: node dist/src/server.js PORT

start app on CLUSTER mode + hot-reload: pm2 start dist/src/server.js --name="app1" --watch -i max

logging process status in console: p2 list || pm2 monit

to stop app: pm2 stop app1

## FOREVER

start server: forever start ./dist/src/server.js

logging process status in console: forever list
