const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

function isProjectMetro(status, root) {
  if (status?.body.trim() !== 'packager-status:running' || typeof status.root !== 'string') return false;
  try { return path.resolve(decodeURI(status.root)) === path.resolve(root); }
  catch { return false; }
}

function readMetroStatus(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}/status`, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 4096) { response.destroy(); resolve(null); }
      });
      response.on('error', () => resolve(null));
      response.on('end', () => resolve({ body, root: response.headers['x-react-native-project-root'] }));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

async function probeMetroPort(port) {
  const available = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve(false);
      else reject(error);
    });
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.close((error) => error ? reject(error) : resolve(true));
    });
  });
  return available ? { available: true, status: null } : { available: false, status: await readMetroStatus(port) };
}

/** A busy port is never evidence that another project can be reused.
 * Check TCP availability too: a non-HTTP service must not look free. */
async function chooseMetroPort({ root, firstPort = 8081, probe = probeMetroPort, onBusy = () => {} }) {
  if (!Number.isInteger(firstPort) || firstPort < 1 || firstPort > 65535) {
    throw new Error('METEVO_METRO_PORT deve essere un numero intero da 1 a 65535.');
  }
  for (let port = firstPort; port < Math.min(firstPort + 20, 65536); port++) {
    const result = await probe(port);
    if (result.available) return { port, reuse: false };
    if (isProjectMetro(result.status, root)) return { port, reuse: true };
    onBusy(port);
  }
  throw new Error('Nessuna porta Metro libera nelle 20 porte esaminate. Imposta METEVO_METRO_PORT e riprova.');
}

module.exports = { chooseMetroPort, readMetroStatus, isProjectMetro };
