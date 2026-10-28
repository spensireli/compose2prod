import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

export interface ComposeHealthCheck {
  readonly command: string[];
  readonly intervalSeconds?: number;
  readonly timeoutSeconds?: number;
  readonly retries?: number;
  readonly startPeriodSeconds?: number;
}

export interface ComposePort {
  readonly containerPort: number;
  readonly protocol: 'tcp' | 'udp';
  readonly published: boolean;
  readonly publishedPort?: number;
}

export interface ComposeService {
  readonly name: string;
  readonly image: string;
  readonly command?: string[];
  readonly entryPoint?: string[];
  readonly environment: Record<string, string>;
  readonly ports: ComposePort[];
  readonly replicas?: number;
  readonly cpuArchitecture?: 'ARM64' | 'X86_64';
  readonly healthCheck?: ComposeHealthCheck;
}

interface ComposeDocument {
  readonly services?: Record<string, unknown>;
}

type UnknownRecord = Record<string, unknown>;

export function loadComposeServices(
  composeFilePath: string,
  selectedServiceNames?: readonly string[],
): ComposeService[] {
  const absolutePath = path.resolve(composeFilePath);
  let document: ComposeDocument;

  try {
    document = parse(fs.readFileSync(absolutePath, 'utf8')) as ComposeDocument;
  } catch (error) {
    throw new Error(`Unable to read Docker Compose file at ${absolutePath}: ${errorMessage(error)}`);
  }

  if (!isRecord(document) || !isRecord(document.services)) {
    throw new Error(`Docker Compose file at ${absolutePath} must define a services mapping`);
  }

  const services = document.services as UnknownRecord;
  const availableNames = Object.keys(services);
  const serviceNames = selectedServiceNames ?? availableNames;
  if (serviceNames.length === 0) {
    throw new Error('At least one Compose service must be selected');
  }

  const missingNames = serviceNames.filter((name) => !(name in services));
  if (missingNames.length > 0) {
    throw new Error(
      `Compose services not found: ${missingNames.join(', ')}. Available services: ${availableNames.join(', ')}`,
    );
  }

  return serviceNames.map((name) => parseService(name, services[name]));
}

function parseService(name: string, value: unknown): ComposeService {
  if (!isRecord(value)) {
    throw serviceError(name, 'definition must be a mapping');
  }

  if (value.build !== undefined && value.image === undefined) {
    throw serviceError(name, 'build-only services are not supported; publish an image and set image');
  }
  if (typeof value.image !== 'string' || value.image.trim() === '') {
    throw serviceError(name, 'image must be a non-empty string');
  }
  for (const unsupported of ['volumes', 'secrets', 'configs']) {
    if (value[unsupported] !== undefined) {
      throw serviceError(name, `${unsupported} are not supported yet`);
    }
  }

  const deploy = optionalRecord(value.deploy, name, 'deploy');
  const replicas = optionalNonNegativeInteger(deploy?.replicas, name, 'deploy.replicas');

  return {
    name,
    image: value.image,
    command: parseCommand(value.command, name, 'command'),
    entryPoint: parseCommand(value.entrypoint, name, 'entrypoint'),
    environment: parseEnvironment(value.environment, name),
    ports: mergePorts(
      parsePorts(value.ports, name, true),
      parsePorts(value.expose, name, false),
    ),
    replicas,
    cpuArchitecture: parsePlatform(value.platform, name),
    healthCheck: parseHealthCheck(value.healthcheck, name),
  };
}

function parseEnvironment(value: unknown, serviceName: string): Record<string, string> {
  if (value === undefined || value === null) {
    return {};
  }

  const result: Record<string, string> = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'string' || !item.includes('=')) {
        throw serviceError(
          serviceName,
          'environment list entries must use KEY=VALUE; host environment lookup is not supported',
        );
      }
      const separator = item.indexOf('=');
      result[item.slice(0, separator)] = item.slice(separator + 1);
    }
    return result;
  }

  if (!isRecord(value)) {
    throw serviceError(serviceName, 'environment must be a mapping or a list of KEY=VALUE strings');
  }
  for (const [key, environmentValue] of Object.entries(value)) {
    if (environmentValue === null || environmentValue === undefined) {
      continue;
    }
    if (!['string', 'number', 'boolean'].includes(typeof environmentValue)) {
      throw serviceError(serviceName, `environment variable ${key} must have a scalar value`);
    }
    result[key] = String(environmentValue);
  }
  return result;
}

function parseCommand(value: unknown, serviceName: string, field: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return ['/bin/sh', '-c', value];
  }
  if (Array.isArray(value) && value.every((part) => typeof part === 'string')) {
    return value;
  }
  throw serviceError(serviceName, `${field} must be a string or a list of strings`);
}

function parsePorts(value: unknown, serviceName: string, published: boolean): ComposePort[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw serviceError(serviceName, 'ports must be a list');
  }

  const seen = new Set<string>();
  return value.map((port, index) => {
    const parsed = parsePort(port, serviceName, index, published);
    const key = `${parsed.containerPort}/${parsed.protocol}`;
    if (seen.has(key)) {
      throw serviceError(serviceName, `port ${key} is declared more than once`);
    }
    seen.add(key);
    return parsed;
  });
}

function parsePort(
  value: unknown,
  serviceName: string,
  index: number,
  published: boolean,
): ComposePort {
  if (typeof value === 'number') {
    return { containerPort: validatePort(value, serviceName), protocol: 'tcp', published };
  }

  if (typeof value === 'string') {
    const [portExpression, protocolExpression] = value.split('/');
    const segments = portExpression.split(':');
    const containerPort = segments[segments.length - 1];
    if (!/^\d+$/.test(containerPort)) {
      throw serviceError(serviceName, `unsupported port expression: ${value}`);
    }
    return {
      containerPort: validatePort(Number(containerPort), serviceName),
      protocol: validateProtocol(protocolExpression, serviceName),
      published,
      publishedPort:
        published && segments.length > 1
          ? parsePublishedPort(segments[segments.length - 2], serviceName)
          : undefined,
    };
  }

  if (isRecord(value)) {
    return {
      containerPort: validatePort(value.target, serviceName),
      protocol: validateProtocol(value.protocol, serviceName),
      published,
      publishedPort: published ? parseOptionalPublishedPort(value.published, serviceName) : undefined,
    };
  }

  throw serviceError(serviceName, `ports[${index}] must use Compose short or long syntax`);
}

function mergePorts(publishedPorts: ComposePort[], exposedPorts: ComposePort[]): ComposePort[] {
  const merged = new Map<string, ComposePort>();
  for (const port of [...publishedPorts, ...exposedPorts]) {
    const key = `${port.containerPort}/${port.protocol}`;
    if (!merged.has(key)) {
      merged.set(key, port);
    }
  }
  return [...merged.values()];
}

function parseOptionalPublishedPort(value: unknown, serviceName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parsePublishedPort(value, serviceName);
}

function parsePublishedPort(value: unknown, serviceName: string): number {
  if (typeof value === 'number') {
    return validatePort(value, serviceName);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return validatePort(Number(value), serviceName);
  }
  throw serviceError(serviceName, `published port must be a single integer, got ${String(value)}`);
}

function parsePlatform(value: unknown, serviceName: string): 'ARM64' | 'X86_64' | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'linux/arm64') {
    return 'ARM64';
  }
  if (value === 'linux/amd64' || value === 'linux/x86_64') {
    return 'X86_64';
  }
  throw serviceError(serviceName, `unsupported platform ${String(value)}; use linux/amd64 or linux/arm64`);
}

function parseHealthCheck(value: unknown, serviceName: string): ComposeHealthCheck | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw serviceError(serviceName, 'healthcheck must be a mapping');
  }
  if (value.disable === true) {
    return undefined;
  }
  if (!Array.isArray(value.test) || !value.test.every((part) => typeof part === 'string')) {
    throw serviceError(serviceName, 'healthcheck.test must be a list of strings');
  }
  if (value.test[0] === 'NONE') {
    return undefined;
  }
  if (!['CMD', 'CMD-SHELL'].includes(value.test[0])) {
    throw serviceError(serviceName, 'healthcheck.test must begin with CMD, CMD-SHELL, or NONE');
  }

  return {
    command: value.test,
    intervalSeconds: parseDuration(value.interval, serviceName, 'healthcheck.interval'),
    timeoutSeconds: parseDuration(value.timeout, serviceName, 'healthcheck.timeout'),
    retries: optionalNonNegativeInteger(value.retries, serviceName, 'healthcheck.retries'),
    startPeriodSeconds: parseDuration(value.start_period, serviceName, 'healthcheck.start_period'),
  };
}

function parseDuration(value: unknown, serviceName: string, field: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw serviceError(serviceName, `${field} must be a Compose duration string`);
  }

  const unitInSeconds: Record<string, number> = {
    us: 0.000001,
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
  };
  const partPattern = /(\d+(?:\.\d+)?)(us|ms|s|m|h)/g;
  let total = 0;
  let consumed = '';
  for (const match of value.matchAll(partPattern)) {
    total += Number(match[1]) * unitInSeconds[match[2]];
    consumed += match[0];
  }
  if (consumed !== value || total <= 0) {
    throw serviceError(serviceName, `${field} has invalid duration ${value}`);
  }
  return Math.ceil(total);
}

function optionalRecord(value: unknown, serviceName: string, field: string): UnknownRecord | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw serviceError(serviceName, `${field} must be a mapping`);
  }
  return value;
}

function optionalNonNegativeInteger(
  value: unknown,
  serviceName: string,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw serviceError(serviceName, `${field} must be a non-negative integer`);
  }
  return value as number;
}

function validatePort(value: unknown, serviceName: string): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 65535) {
    throw serviceError(serviceName, 'container port must be an integer between 1 and 65535');
  }
  return value as number;
}

function validateProtocol(value: unknown, serviceName: string): 'tcp' | 'udp' {
  const protocol = value ?? 'tcp';
  if (protocol !== 'tcp' && protocol !== 'udp') {
    throw serviceError(serviceName, `unsupported port protocol ${String(protocol)}`);
  }
  return protocol;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serviceError(serviceName: string, message: string): Error {
  return new Error(`Compose service "${serviceName}": ${message}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
