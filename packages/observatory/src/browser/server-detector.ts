import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Kiểm tra xem một cổng HTTP có đang phục vụ web không
 */
export async function checkPortReady(url: string, timeoutMs: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Tự động tìm hoặc khởi động Dev Server của project
 */
export async function autoDetectOrStartServer(rootDir: string = process.cwd()): Promise<{
  url: string;
  isEphemeral: boolean;
  cleanup: () => void;
}> {
  const commonUrls = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8080',
  ];

  // 1. Kiểm tra xem server đã bật sẵn chưa
  for (const testUrl of commonUrls) {
    const isReady = await checkPortReady(testUrl, 400);
    if (isReady) {
      return {
        url: testUrl,
        isEphemeral: false,
        cleanup: () => {},
      };
    }
  }

  // 2. Nếu chưa bật, kiểm tra package.json để start server ngầm
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      url: 'http://localhost:3000',
      isEphemeral: false,
      cleanup: () => {},
    };
  }

  let serverProcess: ChildProcess | null = null;
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  try {
    serverProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: rootDir,
      stdio: 'ignore',
      detached: !isWindows,
      env: { ...process.env, PORT: '3000' },
    });

    // Chờ tối đa 8 giây cho server khởi động
    const targetUrl = 'http://localhost:3000';
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const ready = await checkPortReady(targetUrl, 500);
      if (ready) {
        return {
          url: targetUrl,
          isEphemeral: true,
          cleanup: () => {
            if (serverProcess) {
              try {
                if (isWindows && serverProcess.pid) {
                  spawn('taskkill', ['/pid', serverProcess.pid.toString(), '/T', '/F']);
                } else {
                  serverProcess.kill('SIGTERM');
                }
              } catch {
                // Ignore kill errors
              }
            }
          },
        };
      }
    }
  } catch {
    // Fallback if spawn fails
  }

  return {
    url: 'http://localhost:3000',
    isEphemeral: false,
    cleanup: () => {},
  };
}
