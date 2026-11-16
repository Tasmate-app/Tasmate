import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomScene } from '../../game3d/RoomScene';
import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { formatFacilityProduction } from '../../domain/facility';
import { CHARACTER_DEFINITIONS, FACILITY_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { CharacterPanel } from '../house/CharacterPanel';
import { FacilityPanel } from '../house/FacilityPanel';
import { attributeClass, attributeGlyph } from '../companions/characterVisual';

/** 拠点（3Dシェアハウスと住人・施設の閲覧） */
export function BasePage() {
  const characters = useAppStore((s) => s.characters);
  const facilities = useAppStore((s) => s.facilities);
  const navigate = useNavigate();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

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
    selectedFacility !== null && selectedFacilityDef !== null
      ? formatFacilityProduction(selectedFacilityDef, selectedFacility.level)
      : '';

  const clearSelection = () => {
    setSelectedCharacterId(null);
    setSelectedFacilityId(null);
  };

  return (
    <div className="game-screen">
      <div className="game-container">
        <h1 className="game-screen__title">拠点</h1>
        <p className="list-item__meta companion-lead">
          3Dシェアハウスを眺め、住人と施設の状況を確認できます。施設の強化・稼働切替は施設タブで行います。
        </p>

        <section
          className="home-stage"
          style={{ height: 'min(520px, 62vh)', flex: 'none' }}
          aria-label="3Dシェアハウス"
        >
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
            <p className="home-chip">キャラ・施設をタップして操作できます</p>
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
                <button
                  type="button"
                  className="ctx-panel__close"
                  onClick={clearSelection}
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
              <p className="list-item__meta">{selectedCharacterDef.description}</p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigate('/character', {
                      state: { selectedId: selectedCharacter.definitionId },
                    })
                  }
                >
                  詳細を見る
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() =>
                    navigate('/character', {
                      state: { selectedId: selectedCharacter.definitionId },
                    })
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
                    {selectedFacility.enabled ? '稼働中' : '停止中'} ／ 現在の生産量{' '}
                    {selectedFacilityProduction}
                  </p>
                </div>
                <button
                  type="button"
                  className="ctx-panel__close"
                  onClick={clearSelection}
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigate('/facilities', {
                      state: { selectedId: selectedFacility.definitionId },
                    })
                  }
                >
                  施設の詳細・強化
                </button>
              </div>
            </section>
          )}
        </section>

        <div className="page-grid page-grid--two">
          <CharacterPanel />
          <FacilityPanel readOnly />
        </div>
      </div>
    </div>
  );
}
