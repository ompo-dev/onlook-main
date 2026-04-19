import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useStore } from '../state/use-store';
import { useShallow } from 'zustand/react/shallow';
import { SearchIcon } from '../icons/SearchIcon';
import { findNodeInTree } from '../utils/find-node';
export { FilterContext } from './filter-utils';
import { FilterContext } from './filter-utils';
import { LayoutSection } from './sections/LayoutSection';
import { StylesSection } from './sections/StylesSection';
import { TransformSection } from './sections/TransformSection';
import { SvgSection } from './sections/SvgSection';
import { TextSection } from './sections/TextSection';
import { MotionSection } from './sections/MotionSection';
import { VariablesSection } from './sections/VariablesSection';
import { AttributesSection } from './sections/AttributesSection';
import { TextInput } from './inputs/TextInput';
import styles from './PropertiesPanel.module.css';

const PROTECTED_TAGS = new Set(['html', 'body', 'head']);
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const SVG_ELEMENTS = new Set([
  'svg',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'tspan',
  'g',
  'use',
  'image',
  'symbol',
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'marker',
  'foreignObject',
]);
const CONTAINER_ONLY = new Set([
  'html',
  'head',
  'body',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'ul',
  'ol',
  'dl',
  'select',
  'optgroup',
  'picture',
  'colgroup',
  'map',
  'video',
  'audio',
  'iframe',
  'object',
  'script',
  'style',
  'noscript',
  'template',
  'svg',
]);

interface PropertiesPanelProps {
  onPropertyChange: (property: string, value: string) => void;
  onAttributeChange?: (name: string, value: string) => void;
  onAttributeDelete?: (name: string) => void;
  onAttributeRename?: (oldName: string, newName: string) => void;
  onElementVariableChange?: (name: string, value: string, originNodeId: number | null) => void;
  onNewElementVariable?: (name: string, value: string) => void;
  onTagChange?: (nodeId: number, tag: string) => void;
  selectedNodeId?: number | null;
  computedStyles?: Record<string, string>;
  selectedAttributes?: Record<string, string>;
  domTree?: unknown;
}

export interface PropertiesPanelHandle {
  toggleFilter: () => void;
}

export const PropertiesPanel = forwardRef<PropertiesPanelHandle, PropertiesPanelProps>(
  function PropertiesPanel(props, ref) {
    const {
      onPropertyChange,
      onAttributeChange,
      onAttributeDelete,
      onAttributeRename,
      onElementVariableChange,
      onNewElementVariable,
      onTagChange,
    } = props;

    const store = useStore(
      useShallow((s) => ({
        selectedNodeId: s.selectedNodeId,
        selectedNodeIds: s.selectedNodeIds,
        computedStyles: s.computedStyles,
        parentDisplay: (s as any).parentDisplay as string | undefined,
        selectedAttributes: s.selectedAttributes,
        domTree: s.domTree,
        properties: (s as any).properties as Array<{ name: string }>,
        elementVariables: s.elementVariables,
        activeEditTab: s.panels.inspector.activeTab,
      })),
    );

    const selectedNodeId =
      props.selectedNodeId !== undefined ? props.selectedNodeId : store.selectedNodeId;
    const computedStyles = props.computedStyles ?? store.computedStyles;
    const selectedAttributes = props.selectedAttributes ?? store.selectedAttributes;
    const domTree = props.domTree !== undefined ? props.domTree : store.domTree;

    const getValue = useCallback(
      (prop: string) => computedStyles[prop] ?? '',
      [computedStyles],
    );

    const handleElementVariableChange = useCallback(
      (name: string, value: string) => {
        const v = store.elementVariables.find((ev: any) => ev.name === name);
        onElementVariableChange?.(name, value, v?.originNodeId ?? null);
      },
      [store.elementVariables, onElementVariableChange],
    );

    const explicitPropertyNames = useMemo(
      () => new Set((store.properties ?? []).map((p) => p.name)),
      [store.properties],
    );

    const [filter, setFilter] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({ toggleFilter: () => setFilterOpen((v) => !v) }), []);

    const isMultiSelect = store.selectedNodeIds.length > 1;
    const activeTab = store.activeEditTab;
    const effectiveTab = isMultiSelect && activeTab !== 'design' ? 'design' : activeTab;

    const panelRef = useRef<HTMLDivElement>(null);
    const scrollByTabRef = useRef<Record<string, number>>({
      design: 0,
      motion: 0,
      variables: 0,
      html: 0,
    });
    const prevTabRef = useRef(effectiveTab);
    const effectiveTabRef = useRef(effectiveTab);
    const filterOpenRef = useRef(filterOpen);
    const filterValueRef = useRef(filter);
    effectiveTabRef.current = effectiveTab;
    filterOpenRef.current = filterOpen;
    filterValueRef.current = filter;

    const getScrollEl = useCallback(() => {
      const el = panelRef.current;
      if (!el) return null;
      return (el.closest('[data-cs-panel]') as HTMLElement) ?? el;
    }, []);

    useLayoutEffect(() => {
      const el = getScrollEl();
      if (!el) return;
      if (prevTabRef.current !== effectiveTab) {
        scrollByTabRef.current[prevTabRef.current] = el.scrollTop;
        el.scrollTop = scrollByTabRef.current[effectiveTab] ?? 0;
        prevTabRef.current = effectiveTab;
      }
    }, [effectiveTab, getScrollEl]);

    useEffect(() => {
      const el = getScrollEl();
      if (!el) return;
      const onScroll = () => {
        scrollByTabRef.current[effectiveTabRef.current] = el.scrollTop;
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    }, [getScrollEl]);

    useEffect(() => {
      setFilter('');
      setFilterOpen(false);
      scrollByTabRef.current = { design: 0, motion: 0, variables: 0, html: 0 };
      const el = getScrollEl();
      if (el) el.scrollTop = 0;
    }, [selectedNodeId, getScrollEl]);

    useEffect(() => {
      if (filterOpen) filterRef.current?.focus();
    }, [filterOpen]);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
          const panelEl = getScrollEl();
          if (!panelEl) return;
          const active = document.activeElement;
          if (active && panelEl.contains(active)) {
            e.preventDefault();
            setFilterOpen(true);
          }
        }
        if (e.key === 'Escape' && filterOpenRef.current && filterValueRef.current === '') {
          setFilterOpen(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [getScrollEl]);

    if (selectedNodeId === null) {
      return (
        <div className={styles.empty}>Select an element to edit its properties</div>
      );
    }

    const selectedTag = (findNodeInTree(domTree as any, selectedNodeId) as any)?.localName ?? '';
    const showSvg = !isMultiSelect && SVG_ELEMENTS.has(selectedTag);
    const showText =
      !isMultiSelect &&
      selectedTag !== '' &&
      !VOID_ELEMENTS.has(selectedTag) &&
      !CONTAINER_ONLY.has(selectedTag);

    return (
      <FilterContext.Provider value={filter}>
        <div ref={panelRef} className={styles.panel}>
          {filterOpen && (
            <div className={styles.filterBar}>
              <SearchIcon size={12} className={styles.filterIcon} />
              <input
                ref={filterRef}
                type="text"
                className={styles.filterInput}
                placeholder="Filter properties..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onBlur={() => {
                  if (!filter) setFilterOpen(false);
                }}
              />
              {filter && (
                <button
                  className={styles.filterClear}
                  onClick={() => {
                    setFilter('');
                    filterRef.current?.focus();
                  }}
                  title="Clear filter"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="2" x2="8" y2="8" />
                    <line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {isMultiSelect && (
            <div className={styles.multiSelectBar}>
              {store.selectedNodeIds.length} elements selected
            </div>
          )}

          {effectiveTab === 'design' && (
            <>
              <LayoutSection
                getValue={getValue}
                onChange={onPropertyChange}
                parentDisplay={store.parentDisplay}
              />
              <StylesSection getValue={getValue} onChange={onPropertyChange} />
              <TransformSection
                getValue={getValue}
                onChange={onPropertyChange}
                explicitPropertyNames={explicitPropertyNames}
              />
              {showSvg && <SvgSection getValue={getValue} onChange={onPropertyChange} />}
              {showText && (
                <TextSection
                  getValue={getValue}
                  onChange={onPropertyChange}
                  explicitPropertyNames={explicitPropertyNames}
                />
              )}
            </>
          )}

          {effectiveTab === 'motion' && !isMultiSelect && (
            <MotionSection getValue={getValue} onChange={onPropertyChange} />
          )}

          {effectiveTab === 'variables' && !isMultiSelect && (
            <VariablesSection
              title="Variables"
              variables={store.elementVariables as Array<{ name: string; value: string }>}
              onChange={handleElementVariableChange}
              onAdd={onNewElementVariable ?? (() => {})}
              addTitle="Add variable"
              resetKey={selectedNodeId ?? undefined}
              standalone={true}
              emptyMessage="No variables on this element"
            />
          )}

          {effectiveTab === 'html' && !isMultiSelect && (
            <>
              {selectedTag && !PROTECTED_TAGS.has(selectedTag) && (
                <TextInput
                  label="tag"
                  displayName="Tag"
                  value={selectedTag}
                  onChange={(v) => {
                    const trimmed = v.trim().toLowerCase();
                    if (trimmed && trimmed !== selectedTag && selectedNodeId !== null) {
                      onTagChange?.(selectedNodeId, trimmed);
                    }
                  }}
                />
              )}
              <AttributesSection
                attributes={selectedAttributes}
                onAttributeChange={onAttributeChange ?? (() => {})}
                onAttributeDelete={onAttributeDelete ?? (() => {})}
                onAttributeRename={onAttributeRename}
              />
            </>
          )}
        </div>
      </FilterContext.Provider>
    );
  },
);
