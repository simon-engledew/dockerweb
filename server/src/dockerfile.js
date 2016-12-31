import tar from 'tar-stream';

var pack = tar.pack();

pack.entry({ name: 'Dockerfile' }, `
FROM gliderlabs/alpine:3.3

CMD /bin/bash
`);

pack.finalize();

export default pack;