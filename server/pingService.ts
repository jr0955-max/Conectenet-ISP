import { execFile } from 'child_process';
import { promisify } from 'util';
import { Tower } from '../src/types/index.js';

const execFileAsync = promisify(execFile);

export interface PingResult {
  host: string;
  status: 'online' | 'warning' | 'offline';
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  packetLossPercent: number;
  packetsSent: number;
  packetsReceived: number;
  rawOutput: string;
  timestamp: string;
  method: 'real_icmp' | 'simulated';
  error?: string;
}

export class PingService {
  /**
   * Sanitiza o endereço IP ou Hostname para evitar qualquer injeção
   */
  private static sanitizeHost(host: string): string | null {
    if (!host || typeof host !== 'string') return null;
    const clean = host.trim();
    // Permite apenas IPs válidos IPv4/IPv6 ou hostnames seguros
    const isValid = /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/.test(clean);
    return isValid ? clean : null;
  }

  /**
   * Executa ping real via utilitário /usr/bin/ping
   */
  public static async pingIcmp(host: string, count = 2, timeoutSec = 2): Promise<PingResult> {
    const cleanHost = this.sanitizeHost(host);
    const timestamp = new Date().toISOString();

    if (!cleanHost) {
      return {
        host,
        status: 'offline',
        avgLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        packetLossPercent: 100,
        packetsSent: count,
        packetsReceived: 0,
        rawOutput: 'Endereço IP ou Hostname inválido.',
        timestamp,
        method: 'real_icmp',
        error: 'Host inválido'
      };
    }

    try {
      const { stdout } = await execFileAsync('/usr/bin/ping', [
        '-c', String(count),
        '-W', String(timeoutSec),
        cleanHost
      ]);

      const parsed = this.parsePingOutput(stdout, cleanHost, count, timestamp);
      return { ...parsed, method: 'real_icmp' };
    } catch (err: any) {
      // Quando o ping tem 100% de perda, o Linux retorna exit code 1 ou 2 com stdout contendo as estatísticas
      const output = (err.stdout || err.stderr || err.message || '').toString();
      const parsed = this.parsePingOutput(output, cleanHost, count, timestamp);
      return {
        ...parsed,
        method: 'real_icmp',
        error: parsed.packetLossPercent === 100 ? 'Tempo esgotado / 100% de perda de pacotes' : err.message
      };
    }
  }

  /**
   * Faz o parser do output do comando ping do Linux
   */
  private static parsePingOutput(output: string, host: string, countSent: number, timestamp: string): Omit<PingResult, 'method'> {
    let loss = 100;
    let received = 0;
    let avg = 0;
    let min = 0;
    let max = 0;

    // Procura linha de estatísticas de pacotes (ex: 2 packets transmitted, 2 received, 0% packet loss)
    const lossMatch = output.match(/(\d+)\s+packets transmitted,\s+(\d+)\s+(?:packets\s+)?received.*?(\d+(?:\.\d+)?)%\s+packet loss/i);
    if (lossMatch) {
      received = parseInt(lossMatch[2], 10) || 0;
      loss = parseFloat(lossMatch[3]);
    } else {
      // Tenta padrão alternativo
      const lossAlt = output.match(/(\d+)%\s+packet loss/i);
      if (lossAlt) loss = parseFloat(lossAlt[1]);
    }

    // Procura linha de rtt / round-trip (ex: rtt min/avg/max/mdev = 0.170/0.170/0.170/0.000 ms)
    const rttMatch = output.match(/(?:rtt|round-trip)\s+min\/avg\/max\/(?:mdev|stddev)\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i);
    if (rttMatch) {
      min = parseFloat(rttMatch[1]);
      avg = parseFloat(rttMatch[2]);
      max = parseFloat(rttMatch[3]);
    } else {
      // Tenta pegar linhas individuais: time=12.4 ms
      const timeMatches = [...output.matchAll(/time=([\d.]+)\s*ms/gi)];
      if (timeMatches.length > 0) {
        const times = timeMatches.map(m => parseFloat(m[1]));
        min = Math.min(...times);
        max = Math.max(...times);
        avg = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }

    let status: 'online' | 'warning' | 'offline' = 'online';
    if (loss >= 100) {
      status = 'offline';
    } else if (loss > 0 || avg > 80) {
      status = 'warning';
    } else {
      status = 'online';
    }

    return {
      host,
      status,
      avgLatencyMs: Math.round(avg * 10) / 10,
      minLatencyMs: Math.round(min * 10) / 10,
      maxLatencyMs: Math.round(max * 10) / 10,
      packetLossPercent: Math.round(loss),
      packetsSent: countSent,
      packetsReceived: received,
      rawOutput: output,
      timestamp
    };
  }

  /**
   * Gera ping realista com variação de jitter para redes rádio/fibra
   */
  public static simulatePing(tower: Tower, forceStatus?: 'online' | 'warning' | 'offline'): PingResult {
    const timestamp = new Date().toISOString();
    const isFiber = tower.frequency?.toLowerCase().includes('gpon') || tower.frequency?.toLowerCase().includes('fibra');
    const baseLatency = isFiber ? 2 : 12; // Fibra tem latência menor que rádio 5.8GHz

    let status = forceStatus || tower.status || 'online';
    let avg = baseLatency + (Math.random() * 8);
    let min = Math.max(1, avg - (Math.random() * 3));
    let max = avg + (Math.random() * 5);
    let loss = 0;
    let error: string | undefined;

    if (status === 'offline') {
      avg = 0;
      min = 0;
      max = 0;
      loss = 100;
      error = 'Tempo limite esgotado. Host inacessível (100% de perda)';
    } else if (status === 'warning') {
      avg = 85 + (Math.random() * 45); // Alta latência
      min = 60;
      max = avg + 30;
      loss = Math.random() > 0.5 ? 25 : 0; // Pode ter perda parcial
      error = loss > 0 ? `Perda parcial de pacotes (${loss}%) detectada no enlace` : 'Latência alta acima do limite (>80ms)';
    }

    const output = status === 'offline'
      ? `PING ${tower.ipGateway} (${tower.ipGateway}) 56(84) bytes of data.\nFrom 10.50.0.1 icmp_seq=1 Destination Host Unreachable\nFrom 10.50.0.1 icmp_seq=2 Destination Host Unreachable\n--- ${tower.ipGateway} ping statistics ---\n2 packets transmitted, 0 received, +2 errors, 100% packet loss, time 2000ms`
      : `PING ${tower.ipGateway} (${tower.ipGateway}) 56(84) bytes of data.\n64 bytes from ${tower.ipGateway}: icmp_seq=1 ttl=64 time=${min.toFixed(2)} ms\n64 bytes from ${tower.ipGateway}: icmp_seq=2 ttl=64 time=${max.toFixed(2)} ms\n--- ${tower.ipGateway} ping statistics ---\n2 packets transmitted, 2 received, ${loss}% packet loss, time 1001ms\nrtt min/avg/max = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)} ms`;

    return {
      host: tower.ipGateway,
      status,
      avgLatencyMs: Math.round(avg * 10) / 10,
      minLatencyMs: Math.round(min * 10) / 10,
      maxLatencyMs: Math.round(max * 10) / 10,
      packetLossPercent: loss,
      packetsSent: 2,
      packetsReceived: status === 'offline' ? 0 : 2,
      rawOutput: output,
      timestamp,
      method: 'simulated',
      error
    };
  }
}
