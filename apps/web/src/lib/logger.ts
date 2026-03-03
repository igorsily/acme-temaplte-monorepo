type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
	level?: LogLevel;
}

class Logger {
	private readonly level: LogLevel;

	constructor(options?: LoggerOptions) {
		// Default to 'info' in production, 'debug' in development
		this.level = options?.level || (import.meta.env?.DEV ? "debug" : "info");
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
		};
		return levels[level] >= levels[this.level];
	}

	private formatLog(msg: string, ...args: unknown[]): unknown[] {
		// Just output string messages and args directly to console
		// This leverages the browser's native JSON tree formatting
		return [msg, ...args];
	}

	debug(msg: string, ...args: unknown[]) {
		if (this.shouldLog("debug")) {
			console.debug(...this.formatLog(msg, ...args));
		}
	}

	info(msg: string, ...args: unknown[]) {
		if (this.shouldLog("info")) {
			console.info(...this.formatLog(msg, ...args));
		}
	}

	warn(msg: string, ...args: unknown[]) {
		if (this.shouldLog("warn")) {
			console.warn(...this.formatLog(msg, ...args));
		}
	}

	error(msg: string, ...args: unknown[]) {
		if (this.shouldLog("error")) {
			console.error(...this.formatLog(msg, ...args));

			// Here you could add error reporting integration like Sentry
			// if import.meta.env.PROD { ... }
		}
	}
}

// Export a singleton instance
export const logger = new Logger();
