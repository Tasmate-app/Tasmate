import type { AIRewardEvaluation, TaskAnalysisInput } from '@tasmate/types';

/**
 * タスク内容から結晶の種類と難易度を判定するインターフェース。
 * モデル実装（WebGPU / ONNX / ネイティブ推論など）はこのインターフェースを実装する。
 * 失敗時は呼び出し側が `analyzeTaskFallback` を使う。
 */
export interface TaskAnalyzer {
  readonly id: string;
  analyze(input: TaskAnalysisInput): Promise<AIRewardEvaluation>;
}
