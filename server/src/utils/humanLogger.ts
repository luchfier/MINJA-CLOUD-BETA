// src/utils/humanLogger.ts
// Formatter log ramah manusia (Human-Readable Logger)
// Menyajikan log terminal yang rapi, informatif, dan mudah dipahami operator

const isColorSupported = process.stdout.isTTY ?? true;

const c = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  blue: isColorSupported ? '\x1b[34m' : '',
  magenta: isColorSupported ? '\x1b[35m' : '',
  brightCyan: isColorSupported ? '\x1b[96m' : '',
  brightGreen: isColorSupported ? '\x1b[92m' : '',
};

function getTimestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${c.gray}[${h}:${m}:${s}]${c.reset}`;
}

export const humanLogger = {
  info(category: string, message: string) {
    console.log(`${getTimestamp()} ${c.cyan}[${category}]${c.reset} ${message}`);
  },

  success(category: string, message: string) {
    console.log(`${getTimestamp()} ${c.brightGreen}✅ [${category}]${c.reset} ${message}`);
  },

  warn(category: string, message: string) {
    console.log(`${getTimestamp()} ${c.yellow}⚠️  [${category}]${c.reset} ${message}`);
  },

  error(category: string, message: string, detail?: any) {
    let detailStr = '';
    if (detail) {
      if (typeof detail === 'string') {
        detailStr = ` ${c.dim}(${detail})${c.reset}`;
      } else if (detail.message) {
        detailStr = ` ${c.dim}(${detail.message})${c.reset}`;
      }
    }
    console.log(`${getTimestamp()} ${c.red}❌ [${category}]${c.reset} ${message}${detailStr}`);
  },

  // Domain shortcuts
  server(message: string) {
    console.log(`${getTimestamp()} ${c.brightCyan}🚀 [SERVER]${c.reset} ${message}`);
  },

  database(message: string, isOk = true) {
    if (isOk) {
      console.log(`${getTimestamp()} ${c.green}🗄️  [DATABASE]${c.reset} ${message}`);
    } else {
      console.log(`${getTimestamp()} ${c.yellow}⚠️  [DATABASE]${c.reset} ${message}`);
    }
  },

  session(message: string) {
    console.log(`${getTimestamp()} ${c.magenta}📸 [SESI]${c.reset} ${message}`);
  },

  payment(message: string) {
    console.log(`${getTimestamp()} ${c.green}💳 [PEMBAYARAN]${c.reset} ${message}`);
  },

  cash(message: string) {
    console.log(`${getTimestamp()} ${c.brightGreen}💵 [KASIR]${c.reset} ${message}`);
  },

  print(message: string, isOk = true) {
    if (isOk) {
      console.log(`${getTimestamp()} ${c.cyan}🖨️  [PRINTER]${c.reset} ${message}`);
    } else {
      console.log(`${getTimestamp()} ${c.yellow}⚠️  [PRINTER]${c.reset} ${message}`);
    }
  },

  storage(message: string) {
    console.log(`${getTimestamp()} ${c.blue}💾 [STORAGE]${c.reset} ${message}`);
  },

  sync(message: string) {
    console.log(`${getTimestamp()} ${c.brightCyan}☁️  [SYNC]${c.reset} ${message}`);
  },

  email(message: string) {
    console.log(`${getTimestamp()} ${c.magenta}📧 [EMAIL]${c.reset} ${message}`);
  },

  cleanup(message: string) {
    console.log(`${getTimestamp()} ${c.yellow}🧹 [CLEANUP]${c.reset} ${message}`);
  },

  network(message: string, isOnline = true) {
    if (isOnline) {
      console.log(`${getTimestamp()} ${c.green}🌐 [JARINGAN]${c.reset} ${message}`);
    } else {
      console.log(`${getTimestamp()} ${c.red}📡 [JARINGAN]${c.reset} ${message}`);
    }
  },
};
