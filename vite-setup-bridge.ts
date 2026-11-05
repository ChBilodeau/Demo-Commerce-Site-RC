import type { Plugin, ViteDevServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Dev-only Vite plugin: the "setup bridge".
 *
 * It gives the browser setup wizard a way to (a) read/write the user's
 * `demo.config.json` on disk and (b) exchange messages with the Kiro setup
 * skill — which can't talk to the browser directly. Both sides use plain files:
 *
 *   demo.config.json                 the config the wizard writes / app reads
 *   .kiro/setup-bridge/messages.json questions the SKILL posts for the user
 *   .kiro/setup-bridge/answers.json  answers the USER submits for the skill
 *   .kiro/setup-bridge/status.json   progress the skill reports to the wizard
 *
 * Endpoints (dev server only; never shipped in a production build):
 *   GET  /__setup/config    -> current demo.config.json (or {} if absent)
 *   POST /__setup/config    -> write demo.config.json
 *   GET  /__setup/messages  -> pending skill questions + latest status
 *   POST /__setup/answer    -> append a user's answer for the skill
 *
 * The Kiro skill simply reads/writes the same files, so no process-to-process
 * channel is needed and the browser only ever talks to its own dev server.
 */
export function setupBridge(): Plugin {
  const root = process.cwd();
  const bridgeDir = path.join(root, '.kiro', 'setup-bridge');
  const configPath = path.join(root, 'demo.config.json');
  const messagesPath = path.join(bridgeDir, 'messages.json');
  const answersPath = path.join(bridgeDir, 'answers.json');
  const statusPath = path.join(bridgeDir, 'status.json');

  async function readJson(file: string, fallback: unknown) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  }

  function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }

  return {
    name: 'setup-bridge',
    apply: 'serve', // dev only
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/__setup/')) return next();

        try {
          await fs.mkdir(bridgeDir, { recursive: true });

          // GET /__setup/config
          if (url === '/__setup/config' && req.method === 'GET') {
            return json(res, 200, await readJson(configPath, {}));
          }

          // POST /__setup/config  (save the wizard's config)
          if (url === '/__setup/config' && req.method === 'POST') {
            const body = await readBody(req);
            // Validate it parses before writing.
            const parsed = JSON.parse(body);
            await fs.writeFile(configPath, JSON.stringify(parsed, null, 2) + '\n');
            return json(res, 200, { ok: true });
          }

          // GET /__setup/messages  (skill questions + status for the wizard)
          if (url === '/__setup/messages' && req.method === 'GET') {
            return json(res, 200, {
              messages: await readJson(messagesPath, []),
              status: await readJson(statusPath, null),
            });
          }

          // POST /__setup/answer  (append the user's answer for the skill)
          if (url === '/__setup/answer' && req.method === 'POST') {
            const body = await readBody(req);
            const answer = JSON.parse(body);
            const answers = (await readJson(answersPath, [])) as unknown[];
            answers.push({ ...answer, at: new Date().toISOString() });
            await fs.writeFile(answersPath, JSON.stringify(answers, null, 2) + '\n');
            return json(res, 200, { ok: true });
          }

          return json(res, 404, { error: 'unknown setup endpoint' });
        } catch (err) {
          return json(res, 400, { error: String(err) });
        }
      });
    },
  };
}
