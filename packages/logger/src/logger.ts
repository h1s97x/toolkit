import type { Logger, LoggerOptions, LogLevel, LogObject, SerializerFn, Transport } from './types';
import { LOG_LEVEL_NUMBERS } from './types';
import { isLevelEnabled } from './levels';
import { timestamp } from './utils/format';
import { redact } from './utils/redact';
import { createConsoleTransport } from './transports/console';

export class LoggerImpl implements Logger {
  readonly level: LogLevel;
  private opts: Required<Pick<LoggerOptions, 'base' | 'serializers' | 'redact' | 'mixin' | 'timestamp'>>;
  private optsName?: string;
  private transports: Transport[];
  private bindings: Record<string, unknown>;

  constructor(options: LoggerOptions = {}, bindings: Record<string, unknown> = {}) {
    this.level = options.level ?? 'info';
    this.optsName = options.name;
    this.bindings = bindings;

    this.opts = {
      base: options.base ?? {},
      serializers: options.serializers ?? {},
      redact: options.redact ?? [],
      mixin: options.mixin ?? (() => ({})),
      timestamp: options.timestamp ?? true,
    };

    const transport = options.transport;
    if (transport) {
      this.transports = Array.isArray(transport) ? transport : [transport];
    } else {
      this.transports = [createConsoleTransport()];
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new LoggerImpl(
      {
        name: this.optsName,
        level: this.level,
        base: this.opts.base,
        serializers: this.opts.serializers,
        redact: this.opts.redact,
        mixin: this.opts.mixin,
        timestamp: this.opts.timestamp,
        transport: this.transports,
      },
      { ...this.bindings, ...bindings },
    );
  }

  trace(obj: Record<string, unknown>, msg?: string): void {
    this._log('trace', obj, msg);
  }

  debug(obj: Record<string, unknown>, msg?: string): void {
    this._log('debug', obj, msg);
  }

  info(obj: Record<string, unknown>, msg?: string): void {
    this._log('info', obj, msg);
  }

  warn(obj: Record<string, unknown>, msg?: string): void {
    this._log('warn', obj, msg);
  }

  error(obj: Record<string, unknown> | Error, msg?: string): void {
    this._log('error', obj, msg);
  }

  fatal(obj: Record<string, unknown> | Error, msg?: string): void {
    this._log('fatal', obj, msg);
  }

  private _log(
    level: LogLevel,
    obj: Record<string, unknown> | Error,
    msg?: string,
  ): void {
    if (!isLevelEnabled(level, this.level)) return;

    // Normalize: if only one string arg, treat it as msg
    let mergeObject: Record<string, unknown>;
    let message: string;
    if (typeof obj === 'string') {
      mergeObject = {};
      message = obj;
    } else if (obj instanceof Error) {
      mergeObject = { err: obj };
      message = msg ?? obj.message;
    } else {
      mergeObject = obj;
      message = msg ?? '';
    }

    // Apply serializers
    const serialized = this._applySerializers(mergeObject);

    // Build log object
    const logObj = this._buildLogObject(level, serialized, message);

    // Apply redaction
    const finalObj = this._applyRedact(logObj);

    // Dispatch to transports
    for (const transport of this.transports) {
      try {
        transport.write(finalObj);
      } catch (err) {
        if (transport.onError) {
          transport.onError(err as Error, finalObj);
        }
        // Silently ignore transport errors
      }
    }
  }

  private _applySerializers(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const serializers = this.opts.serializers;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const serializer: SerializerFn | undefined = serializers[key];
      if (serializer) {
        result[key] = serializer(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }

    return result;
  }

  private _applyRedact(logObj: LogObject): LogObject {
    if (!this.opts.redact || this.opts.redact.length === 0) return logObj;
    return redact(logObj, this.opts.redact) as LogObject;
  }

  private _buildLogObject(
    level: LogLevel,
    obj: Record<string, unknown>,
    msg: string,
  ): LogObject {
    const ts = this.opts.timestamp;
    const timeStr = ts === true ? timestamp() : typeof ts === 'function' ? ts() : '';

    const logObj: LogObject = {
      level: LOG_LEVEL_NUMBERS[level],
      time: timeStr,
      msg,
      ...this.opts.base,
      ...this.bindings,
      ...obj,
      ...this.opts.mixin(),
    };

    if (this.optsName) {
      logObj.name = this.optsName;
    }

    return logObj;
  }
}
