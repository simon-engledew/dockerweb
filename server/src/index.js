import Docker from 'dockerode';
import './lib/denodeify-proxy';
import pty from 'pty.js';
import express from 'express';
import http from 'http';
import server from 'socket.io';
import path from 'path';
import SocketStream from './lib/socketstream';
import dockerfile from './dockerfile';
import colors from 'ansi-256-colors';

const TAG = 'dockerweb:latest';

const docker = new Docker({socketPath: '/var/run/docker.sock'});

function formatId(value) {
  return value.slice(0, 12);
}

async function init() {
  const app = express();

  app.get('/docker', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use('/', express.static(path.join(__dirname, '..', 'public')));

  console.log(`[INFO] Building ${ TAG }`);

  const stream = await docker.denodeify.buildImage(dockerfile, {t: TAG});

  await new Promise((resolve, reject) => {
    stream.on('data', function (data) {
      data.toString().trim().split('\n').forEach(function (line) {
        const json = JSON.parse(line);
        if (json.stream) {
          console.log(`[INFO] ${ json.stream.trim() }`);
        }
        if (json.errorDetail) {
          reject(json.errorDetail.message);
        }
      })
    });
    stream.on('error', reject);
    stream.on('end', resolve);
  });

  const containers = await docker.denodeify.listContainers({all: true});

  console.log('[INFO] Checking for existing containers');

  await Promise.all(containers.map(async function (containerInfo) {
    if (containerInfo.Image == TAG) {
      console.log(`[WARN] Deleting existing container ${ formatId(containerInfo.Id) }`);

      await docker.getContainer(containerInfo.Id).denodeify.remove({force: true});
    }
  }));

  console.log('[INFO] Starting server');

  server(http.createServer(app).listen(process.env.PORT || 3000), {path: '/wetty/socket.io'}).on('connection', function (socket) {
    const write = (data) => socket.emit('output', data)
    const echo = (data) => write(`${ data }\r\n`);

    async function connected() {
      echo(`Creating container`);

      const container = await docker.denodeify.createContainer({Image: TAG, AttachStdin: true, OpenStdin: true, Tty: true});

      console.log(`[INFO] Created container ${ formatId(container.id) }`);

      try {
        write(`Attached to ${ colors.fg.getRgb(5, 2, 6) }${ formatId(container.id) }${ colors.reset }\r\n`);

        const stream = await container.denodeify.attach({stream: true, stdin: true, stdout: true, stderr: true});

        await container.denodeify.start();

        stream.pipe(new SocketStream(socket));

        socket.on('resize', (size) => container.denodeify.resize({h: size.row, w: size.col}).catch(console.error));

        socket.on('input', (data) => stream.write(data));

        function stop() {
          return container.denodeify.stop().then(() => console.log(`[INFO] container ${ formatId(container.id) } stopped`)).catch(console.error);
        }

        socket.on('disconnect', stop);

        await container.denodeify.wait();

        socket.removeListener('disconnect', stop);

        write('[Process completed]\r\n');
      }
      finally {
        console.log(`[INFO] Container ${ formatId(container.id) } removed`);

        await container.denodeify.remove({force: true});
      }
    }

    connected().catch(function (err) {
      console.error(err);
    });
  });
}

init().catch(function (err) {
  console.error(`[FATAL] ${ err }`);
});
