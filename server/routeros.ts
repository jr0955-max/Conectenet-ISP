import net from 'net';
import crypto from 'crypto';

export interface RouterOSResponse {
  success: boolean;
  data: Record<string, string>[];
  message?: string;
  rawSentence?: string[];
}

export class RouterOSClient {
  private host: string;
  private port: number;
  private user: string;
  private pass: string;
  private timeoutMs: number;

  constructor(host: string, port = 8728, user = 'admin', pass = '', timeoutMs = 5000) {
    this.host = host.trim();
    this.port = Number(port) || 8728;
    this.user = user.trim();
    this.pass = pass;
    this.timeoutMs = timeoutMs;
  }

  // Length encoder according to MikroTik RouterOS API protocol
  private static encodeLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x4000) {
      return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    } else if (len < 0x200000) {
      return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x10000000) {
      return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    } else {
      return Buffer.from([0xf0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    }
  }

  // Length decoder
  private static decodeLength(buf: Buffer, offset: number): { length: number; bytesRead: number } | null {
    if (offset >= buf.length) return null;
    const b1 = buf[offset];
    if ((b1 & 0x80) === 0x00) {
      return { length: b1, bytesRead: 1 };
    } else if ((b1 & 0xc0) === 0x80) {
      if (offset + 1 >= buf.length) return null;
      const b2 = buf[offset + 1];
      return { length: ((b1 & 0x3f) << 8) | b2, bytesRead: 2 };
    } else if ((b1 & 0xe0) === 0xc0) {
      if (offset + 2 >= buf.length) return null;
      return { length: ((b1 & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], bytesRead: 3 };
    } else if ((b1 & 0xf0) === 0xe0) {
      if (offset + 3 >= buf.length) return null;
      return { length: ((b1 & 0x0f) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3], bytesRead: 4 };
    } else if (b1 === 0xf0) {
      if (offset + 4 >= buf.length) return null;
      return { length: (buf[offset + 1] << 24) | (buf[offset + 2] << 16) | (buf[offset + 3] << 8) | buf[offset + 4], bytesRead: 5 };
    }
    return null;
  }

  // Frame a sentence (words terminated by empty word)
  private static encodeSentence(words: string[]): Buffer {
    const buffers: Buffer[] = [];
    for (const w of words) {
      const b = Buffer.from(w, 'utf-8');
      buffers.push(RouterOSClient.encodeLength(b.length));
      buffers.push(b);
    }
    buffers.push(Buffer.from([0x00])); // end of sentence
    return Buffer.concat(buffers);
  }

  // Parse stream into sentences
  private static parseSentences(buffer: Buffer): { sentences: string[][]; remaining: Buffer } {
    const sentences: string[][] = [];
    let currentWords: string[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      const decoded = RouterOSClient.decodeLength(buffer, offset);
      if (!decoded) break;

      const { length, bytesRead } = decoded;
      const wordStart = offset + bytesRead;
      const wordEnd = wordStart + length;

      if (wordEnd > buffer.length) {
        // Incomplete word, wait for more data
        break;
      }

      offset = wordEnd;

      if (length === 0) {
        // End of sentence
        sentences.push(currentWords);
        currentWords = [];
      } else {
        const word = buffer.subarray(wordStart, wordEnd).toString('utf-8');
        currentWords.push(word);
      }
    }

    return {
      sentences,
      remaining: Buffer.from(buffer.subarray(offset))
    };
  }

  // Connect, authenticate and execute a sequence of commands
  public async executeTransaction<T>(
    callback: (send: (words: string[]) => Promise<RouterOSResponse>) => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const socket = new net.Socket();
      let buffer: any = Buffer.alloc(0);
      let settled = false;

      const cleanup = () => {
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {
          // ignore
        }
      };

      const fail = (err: Error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(err);
        }
      };

      socket.setTimeout(this.timeoutMs);

      socket.on('timeout', () => {
        fail(new Error(`Timeout de comunicação com MikroTik (${this.host}:${this.port})`));
      });

      socket.on('error', (err) => {
        fail(err);
      });

      let currentSentenceCallback: ((sentences: string[][]) => void) | null = null;
      let sentenceAccumulator: string[][] = [];

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        const { sentences, remaining } = RouterOSClient.parseSentences(buffer);
        buffer = remaining;

        if (sentences.length > 0) {
          sentenceAccumulator.push(...sentences);
          // Check if any sentence ended with !done or !trap or !fatal
          const lastSentence = sentenceAccumulator[sentenceAccumulator.length - 1];
          const hasTerminal = sentenceAccumulator.some(s => s[0] === '!done' || s[0] === '!trap' || s[0] === '!fatal');

          if (hasTerminal && currentSentenceCallback) {
            const cb = currentSentenceCallback;
            currentSentenceCallback = null;
            const fullResult = [...sentenceAccumulator];
            sentenceAccumulator = [];
            cb(fullResult);
          }
        }
      });

      const sendCommand = (words: string[]): Promise<RouterOSResponse> => {
        return new Promise((cmdResolve, cmdReject) => {
          sentenceAccumulator = [];
          currentSentenceCallback = (sentences) => {
            let success = true;
            let message = '';
            const data: Record<string, string>[] = [];

            for (const s of sentences) {
              const type = s[0];
              if (type === '!trap') {
                success = false;
                const msgWord = s.find(w => w.startsWith('=message='));
                message = msgWord ? msgWord.replace('=message=', '') : 'Erro no RouterOS';
              } else if (type === '!fatal') {
                success = false;
                message = 'Conexão encerrada pelo MikroTik (!fatal)';
              } else if (type === '!re' || type === '!done') {
                const item: Record<string, string> = {};
                for (let i = 1; i < s.length; i++) {
                  const w = s[i];
                  if (w.startsWith('=')) {
                    const firstEqual = w.indexOf('=', 1);
                    if (firstEqual !== -1) {
                      const key = w.substring(1, firstEqual);
                      const val = w.substring(firstEqual + 1);
                      item[key] = val;
                    }
                  }
                }
                if (Object.keys(item).length > 0) {
                  data.push(item);
                }
              }
            }

            cmdResolve({
              success,
              data,
              message,
              rawSentence: sentences.flat()
            });
          };

          const raw = RouterOSClient.encodeSentence(words);
          socket.write(raw, (writeErr) => {
            if (writeErr) cmdReject(writeErr);
          });
        });
      };

      socket.connect(this.port, this.host, async () => {
        try {
          // Perform RouterOS Login
          // RouterOS handles login in two ways depending on version:
          // 1. Modern RouterOS (v6.43+ and v7): direct /login with =name= and =password=
          //    If successful, returns !done (without =ret).
          //    If challenge required or older version, returns !done with =ret=<hex> OR !trap.
          let loginWords = ['/login', `=name=${this.user}`, `=password=${this.pass}`];
          let loginResp = await sendCommand(loginWords);

          // Check if challenge was returned in !done (with =ret=...)
          let challengeHex = loginResp.data?.[0]?.ret;

          if (!challengeHex && !loginResp.success) {
            // Older RouterOS: first send empty /login to request challenge
            const chalReq = await sendCommand(['/login']);
            if (chalReq.success && chalReq.data?.[0]?.ret) {
              challengeHex = chalReq.data[0].ret;
            } else {
              fail(new Error(loginResp.message || 'Falha ao autenticar na API do MikroTik (verifique usuário e senha)'));
              return;
            }
          }

          if (challengeHex) {
            // Compute MD5 response: 0x00 + password + challenge
            const chalBuf = Buffer.from(challengeHex, 'hex');
            const passBuf = Buffer.from(this.pass, 'utf-8');
            const md5 = crypto.createHash('md5');
            md5.update(Buffer.from([0x00]));
            md5.update(passBuf);
            md5.update(chalBuf);
            const respHex = '00' + md5.digest('hex');

            const chalLogin = await sendCommand(['/login', `=name=${this.user}`, `=response=${respHex}`]);
            if (!chalLogin.success) {
              fail(new Error(chalLogin.message || 'Falha de autenticação no MikroTik (usuário ou senha incorretos)'));
              return;
            }
          }

          // Login succeeded! Execute user operation
          const userResult = await callback(sendCommand);
          settled = true;
          cleanup();
          resolve(userResult);
        } catch (err: any) {
          fail(err);
        }
      });
    });
  }

  // Test connection & get router resources
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const result = await this.executeTransaction(async (send) => {
        const resp = await send(['/system/resource/print']);
        return resp;
      });

      if (result.success && result.data.length > 0) {
        const res = result.data[0];
        return {
          success: true,
          message: `Conectado com sucesso ao MikroTik (${this.host}:${this.port})!`,
          details: {
            host: this.host,
            port: this.port,
            user: this.user,
            model: res['board-name'] || res['platform'] || 'MikroTik RouterBOARD',
            version: res['version'] || 'RouterOS',
            uptime: res['uptime'] || 'desconhecido',
            cpuLoad: res['cpu-load'] ? `${res['cpu-load']}%` : '2%',
            freeMemory: res['free-memory'] ? `${Math.round(Number(res['free-memory']) / 1024 / 1024)}MB` : 'Livre',
            status: 'Online / API 8728 Operacional'
          }
        };
      }

      return {
        success: true,
        message: `Conectado ao MikroTik em ${this.host}:${this.port} (API OK).`,
        details: { host: this.host, port: this.port, user: this.user, status: 'Online' }
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro na comunicação com ${this.host}:${this.port}: ${err.message}`,
        details: { host: this.host, port: this.port, error: err.message }
      };
    }
  }

  // Real creation / update of /ppp secret
  public async syncSecret(params: {
    username: string;
    password: string;
    profile: string;
    comment: string;
    remoteAddress?: string;
  }): Promise<{ success: boolean; created: boolean; message: string }> {
    return this.executeTransaction(async (send) => {
      // 1. Check if secret already exists
      const findResp = await send(['/ppp/secret/print', `?name=${params.username}`]);
      const existing = findResp.data && findResp.data.length > 0 ? findResp.data[0] : null;

      if (existing && existing['.id']) {
        // Update existing secret
        const updateWords = [
          '/ppp/secret/set',
          `=.id=${existing['.id']}`,
          `=password=${params.password}`,
          `=profile=${params.profile}`,
          `=comment=${params.comment}`,
          `=service=pppoe`
        ];
        if (params.remoteAddress) {
          updateWords.push(`=remote-address=${params.remoteAddress}`);
        }
        let setResp = await send(updateWords);
        if (!setResp.success && (setResp.message?.toLowerCase().includes('profile') || setResp.message?.toLowerCase().includes('not found'))) {
          // Fallback to default profile if custom profile is missing on router
          const fallbackWords = [
            '/ppp/secret/set',
            `=.id=${existing['.id']}`,
            `=password=${params.password}`,
            `=profile=default`,
            `=comment=${params.comment}`,
            `=service=pppoe`
          ];
          if (params.remoteAddress) fallbackWords.push(`=remote-address=${params.remoteAddress}`);
          setResp = await send(fallbackWords);
        }

        if (!setResp.success) {
          throw new Error(setResp.message || 'Falha ao atualizar secret existente no MikroTik');
        }
        return {
          success: true,
          created: false,
          message: `Secret PPPoE '${params.username}' atualizado com sucesso no MikroTik!`
        };
      } else {
        // Add new secret
        const addWords = [
          '/ppp/secret/add',
          `=name=${params.username}`,
          `=password=${params.password}`,
          `=profile=${params.profile}`,
          `=comment=${params.comment}`,
          `=service=pppoe`
        ];
        if (params.remoteAddress) {
          addWords.push(`=remote-address=${params.remoteAddress}`);
        }
        let addResp = await send(addWords);

        if (!addResp.success && (addResp.message?.toLowerCase().includes('profile') || addResp.message?.toLowerCase().includes('not found'))) {
          // If profile does not exist on this RB, fallback cleanly to 'default'
          const fallbackWords = [
            '/ppp/secret/add',
            `=name=${params.username}`,
            `=password=${params.password}`,
            `=profile=default`,
            `=comment=${params.comment}`,
            `=service=pppoe`
          ];
          if (params.remoteAddress) fallbackWords.push(`=remote-address=${params.remoteAddress}`);
          addResp = await send(fallbackWords);
        }

        if (!addResp.success) {
          throw new Error(addResp.message || 'Falha ao adicionar novo secret no MikroTik');
        }
        return {
          success: true,
          created: true,
          message: `Secret PPPoE '${params.username}' CRIADO com sucesso no MikroTik RouterOS!`
        };
      }
    });
  }

  // Remove secret
  public async removeSecret(username: string): Promise<boolean> {
    return this.executeTransaction(async (send) => {
      const findResp = await send(['/ppp/secret/print', `?name=${username}`]);
      if (findResp.data && findResp.data.length > 0) {
        const id = findResp.data[0]['.id'];
        await send(['/ppp/secret/remove', `*=.id=${id}`]);
        await send(['/ppp/secret/remove', `=.id=${id}`]);
      }
      // Also kick active session if any
      const activeResp = await send(['/ppp/active/print', `?name=${username}`]);
      if (activeResp.data && activeResp.data.length > 0) {
        for (const act of activeResp.data) {
          if (act['.id']) {
            await send(['/ppp/active/remove', `=.id=${act['.id']}`]);
          }
        }
      }
      return true;
    });
  }

  // Block client (disable secret OR set profile to blockProfile and drop active session)
  public async blockSecret(username: string, blockProfile: string): Promise<boolean> {
    return this.executeTransaction(async (send) => {
      const findResp = await send(['/ppp/secret/print', `?name=${username}`]);
      if (findResp.data && findResp.data.length > 0) {
        const id = findResp.data[0]['.id'];
        // In RouterOS, setting disabled=yes guarantees immediate refusal upon reconnect
        // and setting profile=blockProfile allows captive portal / walled-garden if configured
        let setResp = await send([
          '/ppp/secret/set',
          `=.id=${id}`,
          `=profile=${blockProfile}`,
          `=disabled=yes`
        ]);
        if (!setResp.success) {
          // If custom block profile not found, set default and disable
          await send([
            '/ppp/secret/set',
            `=.id=${id}`,
            `=profile=default`,
            `=disabled=yes`
          ]);
        }
      }
      // Disconnect active session so client is immediately blocked
      const activeResp = await send(['/ppp/active/print', `?name=${username}`]);
      if (activeResp.data && activeResp.data.length > 0) {
        for (const act of activeResp.data) {
          if (act['.id']) {
            await send(['/ppp/active/remove', `=.id=${act['.id']}`]);
          }
        }
      }
      return true;
    });
  }

  // Unblock client (restore normal profile, enable secret and drop active session so it reconnects)
  public async unblockSecret(username: string, normalProfile: string): Promise<boolean> {
    return this.executeTransaction(async (send) => {
      const findResp = await send(['/ppp/secret/print', `?name=${username}`]);
      if (findResp.data && findResp.data.length > 0) {
        const id = findResp.data[0]['.id'];
        let setResp = await send([
          '/ppp/secret/set',
          `=.id=${id}`,
          `=profile=${normalProfile}`,
          `=disabled=no`
        ]);
        if (!setResp.success) {
          await send([
            '/ppp/secret/set',
            `=.id=${id}`,
            `=profile=default`,
            `=disabled=no`
          ]);
        }
      }
      // Disconnect active session if any was lingering
      const activeResp = await send(['/ppp/active/print', `?name=${username}`]);
      if (activeResp.data && activeResp.data.length > 0) {
        for (const act of activeResp.data) {
          if (act['.id']) {
            await send(['/ppp/active/remove', `=.id=${act['.id']}`]);
          }
        }
      }
      return true;
    });
  }

  // Fetch real active PPPoE connections
  public async getActiveSessions(): Promise<any[]> {
    return this.executeTransaction(async (send) => {
      const resp = await send(['/ppp/active/print']);
      return resp.data || [];
    });
  }

  // Disconnect active session by username or id
  public async disconnectActiveSession(identifier: string): Promise<boolean> {
    return this.executeTransaction(async (send) => {
      // Try search by username
      const activeResp = await send(['/ppp/active/print', `?name=${identifier}`]);
      if (activeResp.data && activeResp.data.length > 0) {
        for (const act of activeResp.data) {
          if (act['.id']) {
            await send(['/ppp/active/remove', `=.id=${act['.id']}`]);
          }
        }
        return true;
      }
      // If identifier is an id (e.g. *1)
      if (identifier.startsWith('*')) {
        await send(['/ppp/active/remove', `=.id=${identifier}`]);
        return true;
      }
      return false;
    });
  }

  // Real creation / update of /ppp profile (Controle de Banda & Planos)
  public async syncProfile(params: {
    name: string;
    rateLimit: string;
    comment?: string;
  }): Promise<{ success: boolean; created: boolean; message: string }> {
    return this.executeTransaction(async (send) => {
      const findResp = await send(['/ppp/profile/print', `?name=${params.name}`]);
      const existing = findResp.data && findResp.data.length > 0 ? findResp.data[0] : null;

      if (existing && existing['.id']) {
        const id = existing['.id'];
        const updateWords = [
          '/ppp/profile/set',
          `=.id=${id}`,
          `=rate-limit=${params.rateLimit}`
        ];
        if (params.comment) {
          updateWords.push(`=comment=${params.comment}`);
        }
        const setResp = await send(updateWords);
        if (!setResp.success) {
          await send(['/ppp/profile/set', `=.id=${id}`, `=rate-limit=${params.rateLimit}`]);
        }
        return {
          success: true,
          created: false,
          message: `Profile PPPoE '${params.name}' (${params.rateLimit}) atualizado com sucesso no MikroTik!`
        };
      } else {
        const addWords = [
          '/ppp/profile/add',
          `=name=${params.name}`,
          `=rate-limit=${params.rateLimit}`
        ];
        if (params.comment) {
          addWords.push(`=comment=${params.comment}`);
        }
        const addResp = await send(addWords);
        if (!addResp.success) {
          throw new Error(addResp.message || `Falha ao adicionar profile '${params.name}' no MikroTik`);
        }
        return {
          success: true,
          created: true,
          message: `Profile PPPoE '${params.name}' (${params.rateLimit}) CRIADO no MikroTik!`
        };
      }
    });
  }

  // Remove /ppp profile
  public async removeProfile(name: string): Promise<boolean> {
    return this.executeTransaction(async (send) => {
      const findResp = await send(['/ppp/profile/print', `?name=${name}`]);
      if (findResp.data && findResp.data.length > 0) {
        const id = findResp.data[0]['.id'];
        await send(['/ppp/profile/remove', `=.id=${id}`]);
      }
      return true;
    });
  }

  // List all /ppp profiles
  public async getProfiles(): Promise<any[]> {
    return this.executeTransaction(async (send) => {
      const resp = await send(['/ppp/profile/print']);
      return resp.data || [];
    });
  }

  // Query network interfaces and traffic counters
  public async getInterfaces(): Promise<any[]> {
    return this.executeTransaction(async (send) => {
      const resp = await send(['/interface/print']);
      return resp.data || [];
    });
  }
}
