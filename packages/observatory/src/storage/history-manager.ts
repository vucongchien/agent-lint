import fs from 'fs';
import path from 'path';
import type { QualityGateResult } from '../types';

export class HistoryManager {
  private baseDir: string;
  private historyFile: string;
  private runsDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.baseDir = path.resolve(rootDir, '.agent-perf');
    this.historyFile = path.join(this.baseDir, 'history.json');
    this.runsDir = path.join(this.baseDir, 'runs');
  }

  private ensureDirs() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.runsDir)) {
      fs.mkdirSync(this.runsDir, { recursive: true });
    }
  }

  /**
   * Lưu snapshot của một lần chạy Quality Gate
   */
  public saveRun(result: QualityGateResult): string {
    this.ensureDirs();
    const filename = `${result.id}.json`;
    const filePath = path.join(this.runsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

    // Cập nhật history index
    const historyList = this.listHistory();
    historyList.unshift({
      id: result.id,
      timestamp: result.timestamp,
      commit: result.git?.commit || 'unknown',
      branch: result.git?.branch || 'main',
      overallScore: result.overallScore,
      grade: result.grade,
      status: result.status,
    });

    // Giữ tối đa 50 bản ghi gần nhất
    const trimmed = historyList.slice(0, 50);
    fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf-8');

    return filePath;
  }

  /**
   * Đọc danh sách mục lục lịch sử
   */
  public listHistory(): Array<{
    id: string;
    timestamp: string;
    commit: string;
    branch: string;
    overallScore: number;
    grade: string;
    status: string;
  }> {
    if (!fs.existsSync(this.historyFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Lấy chi tiết một run theo ID hoặc lấy run gần nhất
   */
  public getRun(id?: string): QualityGateResult | null {
    if (!id) {
      const list = this.listHistory();
      if (list.length === 0) return null;
      id = list[0].id;
    }

    const filePath = path.join(this.runsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }
}
