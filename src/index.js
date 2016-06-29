import Docker from 'dockerode';
import './denodeify-proxy';
import pty from 'pty.js';
import express from 'express';
import http from 'http';
import server from 'socket.io';
import path from 'path';
import SocketStream from './socketstream';

const TAG = 'echo:latest';

const docker = new Docker({socketPath: '/var/run/docker.sock'});

var tar = require('tar-stream');
var pack = tar.pack();
pack.entry({ name: 'Dockerfile' }, `
FROM gliderlabs/alpine:3.3

CMD /bin/bash
`);
pack.finalize();

async function init() {
  const app = express();

  app.get('/docker', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use('/', express.static(path.join(__dirname, '..', 'public')));

  console.log(`building ${ TAG }`);

  await docker.denodeify.buildImage(pack, {t: TAG});

  var containers = await docker.denodeify.listContainers({all: true});

  console.log('checking for existing containers');

  await Promise.all(containers.map(async function (containerInfo) {
    if (containerInfo.Image == TAG) {
      console.log(`deleting existing container ${ containerInfo.Id }`);

      await docker.getContainer(containerInfo.Id).denodeify.remove({force: true});
    }
  }));

  server(http.createServer(app).listen(process.env.PORT || 3000), {path: '/wetty/socket.io'}).on('connection', function (socket) {
    const write = (data) => socket.emit('output', data)

    async function connected() {
      write('creating new container\r\n');

      var container = await docker.denodeify.createContainer({Image: TAG, AttachStdin: true, OpenStdin: true, Tty: true, Cmd: ['/bin/sh']});

      try {
        write(`attaching to container ${ container.id }\r\n`);

        var stream = await container.denodeify.attach({stream: true, stdin: true, stdout: true, stderr: true});

        await container.denodeify.start();

        stream.pipe(new SocketStream(socket));

        socket.on('resize', (size) => container.denodeify.resize({h: size.row, w: size.col}).catch(console.error));

        socket.on('input', (data) => stream.write(data));

        function stop() {
          return container.denodeify.stop().then(() => console.log(`container ${container.id} stopped`)).catch(console.error);
        }

        socket.on('disconnect', stop);

        await container.denodeify.wait();

        socket.removeListener('disconnect', stop);

        write('[Process completed]\r\n');
      }
      finally {
        console.log(`container ${container.id} removed`);

        await container.denodeify.remove({force: true});
      }
    }

    connected().catch(function (err) {
      console.error(err);
    });
  });

}


init().catch(function (err) {
  console.error(err);
});
