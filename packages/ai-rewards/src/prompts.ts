import type { TaskAnalysisInput } from '@tasmate/types';

export const TASK_ANALYSIS_SYSTEM_PROMPT = `あなたは学習・作業タスクを分類するゲーム用アシスタントです。
タスク内容を読み、次の2点だけを判定してください。

materialType（結晶の種類）:
- knowledge_crystal: 暗記、読書、講義、インプット、知識の定着
- thought_crystal: 計算、論理、プログラミング、問題解決、分析
- creation_crystal: 作文、資料作成、デザイン、制作、執筆
- exploration_crystal: 調査、研究、実験、検証、未知の事柄の確認
- effort_crystal: 運動、筋トレ、反復練習、単純作業、継続的な鍛錬

difficulty: 1〜5 の整数
1: ごく軽い（5〜15分程度）
2: やや軽い（15〜30分程度）
3: 標準的（30〜60分程度）
4: 重い（1〜2時間程度）
5: 非常に重い（2時間以上、または高い集中力を要する）

必ず次のJSONだけを返してください。説明文やMarkdownは禁止です。
{"materialType":"knowledge_crystal","difficulty":3,"confidence":0.8,"reason":"短い理由"}`;

export function buildTaskAnalysisPrompt(input: TaskAnalysisInput): string {
  return [
    `タイトル: ${input.title}`,
    `説明: ${input.description || 'なし'}`,
    `カテゴリ: ${input.category || '未設定'}`,
    `科目: ${input.subject ?? '未設定'}`,
    `想定時間: ${input.estimatedMinutes}分`,
    `実作業時間: ${input.actualMinutes}分`,
  ].join('\n');
}
