export interface TutorialStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly string[];
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    eyebrow: 'WELCOME',
    title: 'Tasmateへようこそ',
    body: '現実の勉強やタスクへの取り組みが、キャラクターと拠点の成長につながるゲームです。',
    points: [
      '作業した時間がゲームの進行になる',
      'タスク管理とタイマーが中心',
      'データはこの端末に保存される',
    ],
  },
  {
    id: 'quest',
    eyebrow: 'QUEST',
    title: 'クエストを登録する',
    body: '「出撃」からクエストを作成し、目的地と派遣する仲間を選びます。',
    points: [
      '予定時間かストップウォッチを選択',
      'カテゴリとサブカテゴリで整理',
      'カレンダーから予定も追加できる',
    ],
  },
  {
    id: 'session',
    eyebrow: 'SESSION',
    title: 'タイマーで作業する',
    body: 'クエストを開始するとタイマーが動き、実際に作業した時間に応じてゲームが進みます。',
    points: [
      '一時停止・中断・再開ができる',
      '完了すると報酬が確定する',
      '作業中は施設も稼働する',
    ],
  },
  {
    id: 'reward',
    eyebrow: 'REWARD',
    title: '報酬と育成',
    body: '作業を終えると通貨・素材・経験値を獲得。仲間や施設を育てて次の作業に備えましょう。',
    points: [
      'キャラクターをレベルアップ',
      '施設を強化して生産量を増やす',
      'ショップと倉庫でアイテムを管理',
    ],
  },
  {
    id: 'plan',
    eyebrow: 'PLAN',
    title: '計画と継続',
    body: 'カレンダーで予定を立て、週の達成を振り返りながら無理なく継続できます。',
    points: [
      '繰り返し予定を登録',
      '週の達成率と連続記録を確認',
      '設定の「遊び方」からいつでも見返せる',
    ],
  },
];
