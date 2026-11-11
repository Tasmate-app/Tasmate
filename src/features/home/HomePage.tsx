import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RoomScene } from '../../game3d/RoomScene';
import { ATTRIBUTE_NAMES, MATERIAL_NAMES } from '../../domain/constants';
import { CHARACTER_DEFINITIONS, FACILITY_DEFINITIONS } from '../../data/seed';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';
import { attributeClass, attributeGlyph } from '../companions/characterVisual';

/** ホーム（ゲーム世界のメイン画面。選択時のみコンテキストパネルを開く） */
export function HomePage() {
  const activeSession = useAppStore((s) => s.activeSession);
  const tasks = useAppStore((s) => s.tasks);
  const characters = useAppStore((s) => s.characters);
  const facilities = useAppStore((s) => s.facilities);
  const navigate = useNavigate();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const working = activeSession !== null;
  const now = useNow(1000, working && activeSession.state === 'running');
  const elapsed = sessionElapsedSeconds(activeSession, now);
  const activeTask = tasks.find((t) => t.id === activeSession?.taskId);

  const selectedCharacter =
    selectedCharacterId !== null
      ? (characters.find((c) => c.definitionId === selectedCharacterId) ?? null)
      : null;
  const selectedCharacterDef =
    selectedCharacter !== null
      ? (CHARACTER_DEFINITIONS.find((d) => d.id === selectedCharacter.definitionId) ?? null)
      : null;
  const selectedFacility =
    selectedFacilityId !== null
      ? (facilities.find((f) => f.definitionId === selectedFacilityId) ?? null)
      : null;
  const selectedFacilityDef =
    selectedFacility !== null
      ? (FACILITY_DEFINITIONS.find((d) => d.id === selectedFacility.definitionId) ?? null)
      : null;
  const selectedFacilityProduction =
    selectedFacilityDef?.type === 'currency'
      ? `通貨 ${selectedFacilityDef.baseProductionPerMinute}/分`
      : `素材（${MATERIAL_NAMES[selectedFacilityDef?.materialId ?? ''] ?? ''}）${selectedFacilityDef?.baseProductionPerMinute ?? 0}/分`;

  const clearSelection = () => {
    setSelectedCharacterId(null);
    setSelectedFacilityId(null);
  };

  return (
    <div className="home">
      <section className="home-stage" aria-label="3Dシェアハウス">
        <RoomScene
          selectedCharacterId={selectedCharacterId}
          selectedFacilityId={selectedFacilityId}
          onSelectCharacter={(id) => {
            setSelectedCharacterId(id);
            setSelectedFacilityId(null);
          }}
          onSelectFacility={(id) => {
            setSelectedFacilityId(id);
            setSelectedCharacterId(null);
          }}
          onBackgroundClick={clearSelection}
        />
        <div className="home-stage__overlay home-stage__overlay--top">
          {working ? (
            <Link to="/sortie" className="home-chip home-chip--working">
              作業中：{activeTask?.title ?? 'タスク'} {formatElapsed(elapsed)}
              {activeSession.timerMode === 'stopwatch' ? '（ストップウォッチ）' : ''}
              {activeSession.state === 'paused' ? '（停止中）' : ''} — 出撃へ
            </Link>
          ) : (
            <p className="home-chip">キャラ・施設をタップして操作できます</p>
          )}
        </div>
        <p className="home-stage__overlay home-stage__overlay--bottom" aria-label="操作方法">
          <span className="home-chip home-chip--hint">ドラッグで回転・ホイールでズーム</span>
        </p>

        {selectedCharacter !== null && selectedCharacterDef !== null && (
          <section className="ctx-panel" aria-label={`${selectedCharacterDef.name}の操作`}>
            <div className="ctx-panel__head">
              <span
                className={`unit-avatar ${attributeClass(selectedCharacterDef.attribute)}`}
                aria-hidden="true"
              >
                {selectedCharacterDef.name.slice(0, 1)}
              </span>
              <div>
                <p className="ctx-panel__title">
                  {selectedCharacterDef.name}{' '}
                  <span className="unit-lv">Lv.{selectedCharacter.level}</span>
                </p>
                <p className="list-item__meta">
                  {attributeGlyph(selectedCharacterDef.attribute)}{' '}
                  {ATTRIBUTE_NAMES[selectedCharacterDef.attribute]}
                </p>
              </div>
              <button type="button" className="ctx-panel__close" onClick={clearSelection} aria-label="閉じる">
                ×
              </button>
            </div>
            <p className="list-item__meta">{selectedCharacterDef.description}</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  navigate('/companions', { state: { selectedId: selectedCharacter.definitionId } })
                }
              >
                詳細を見る
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() =>
                  navigate('/companions', { state: { selectedId: selectedCharacter.definitionId } })
                }
              >
                育成する
              </button>
            </div>
          </section>
        )}

        {selectedFacility !== null && selectedFacilityDef !== null && (
          <section className="ctx-panel" aria-label={`${selectedFacilityDef.name}の操作`}>
            <div className="ctx-panel__head">
              <span className="unit-avatar unit-avatar--facility is-on" aria-hidden="true">
                {selectedFacilityDef.type === 'currency' ? '◉' : '⬢'}
              </span>
              <div>
                <p className="ctx-panel__title">
                  {selectedFacilityDef.name}{' '}
                  <span className="unit-lv">Lv.{selectedFacility.level}</span>
                </p>
                <p className="list-item__meta">
                  {selectedFacility.enabled ? '稼働中' : '停止中'} ／ {selectedFacilityProduction}
                </p>
              </div>
              <button type="button" className="ctx-panel__close" onClick={clearSelection} aria-label="閉じる">
                ×
              </button>
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  navigate('/facilities', { state: { selectedId: selectedFacility.definitionId } })
                }
              >
                施設の詳細
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() =>
                  navigate('/facilities', { state: { selectedId: selectedFacility.definitionId } })
                }
              >
                強化する
              </button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
