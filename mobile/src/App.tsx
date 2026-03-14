import { useState, useEffect } from 'react';
import type { Bookmark } from '../../extension/shared/types';
import { getCategories, saveBookmark, isDuplicate } from './api';
import { parseShareParams, resolveAuthorFromUrl } from './utils';
import { UI_STRINGS, ERRORS } from './config';

type ViewState = 'loading' | 'form' | 'duplicate' | 'success' | 'error';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { url: sharedUrl, title: sharedTitle } = parseShareParams(window.location.search);
    setUrl(sharedUrl);
    setTitle(sharedTitle);

    try {
      const cats = await getCategories();
      setCategories(cats.length > 0 ? cats : ['Altres']);
    } catch {
      setCategories(['Altres']);
    }

    setViewState('form');
  }

  function toggleCategory(category: string) {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }

  async function handleAddCategory() {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) { setError(ERRORS.CATEGORY_EMPTY); return; }
    if (categories.includes(trimmedName)) { setError(ERRORS.CATEGORY_EXISTS); return; }

    setIsAddingCategory(true);
    setError('');

    setCategories(prev => [...prev, trimmedName]);
    setSelectedCategories(prev => [...prev, trimmedName]);
    setNewCategoryName('');
    setIsAddingCategory(false);
  }

  async function handleSave() {
    if (!title.trim()) { setError(ERRORS.NO_TITLE); return; }
    if (title.length > 80) { setError(ERRORS.TITLE_TOO_LONG); return; }
    if (!url) { setError(ERRORS.UNKNOWN); return; }

    setViewState('loading');

    try {
      const duplicate = await isDuplicate(url);
      if (duplicate) { setViewState('duplicate'); return; }

      const finalCategories = selectedCategories.length > 0 ? selectedCategories : ['Altres'];

      const bookmark: Bookmark = {
        id: `mob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        author: resolveAuthorFromUrl(url),
        originalLink: url,
        externalLinks: [],
        categories: finalCategories,
        createdAt: Date.now(),
      };

      await saveBookmark(bookmark);
      setViewState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ERRORS.UNKNOWN;
      setError(msg);
      setViewState('error');
    }
  }

  if (viewState === 'loading') {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-400 border-2 border-black p-4 mb-4">
          <h1 className="text-xl font-bold uppercase">{UI_STRINGS.TITLE}</h1>
        </div>
        <p className="font-mono text-sm">{UI_STRINGS.LOADING}</p>
      </div>
    );
  }

  if (viewState === 'duplicate') {
    return (
      <div className="p-6">
        <div className="bg-red-500 border-2 border-black p-4 mb-4 text-white">
          <h1 className="text-xl font-bold uppercase">⚠️ {UI_STRINGS.DUPLICATE_WARNING}</h1>
        </div>
        <p className="font-mono text-sm mb-6">{UI_STRINGS.DUPLICATE_MESSAGE}</p>
        <div className="flex justify-end">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CLOSE}
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'success') {
    return (
      <div className="p-6">
        <div className="bg-green-400 border-2 border-black p-4 text-black">
          <h1 className="text-xl font-bold uppercase">✅ {UI_STRINGS.SUCCESS}</h1>
        </div>
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="p-6">
        <div className="bg-red-500 border-2 border-black p-4 mb-4 text-white">
          <h1 className="text-xl font-bold uppercase">❌ Error al guardar</h1>
        </div>
        <p className="font-mono text-sm mb-6">{error}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CLOSE}
          </button>
          <button onClick={() => { setError(''); setViewState('form'); }} className="btn-primary">
            {UI_STRINGS.RETRY}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-yellow-400 border-b-2 border-black p-4">
        <h1 className="text-xl font-bold uppercase">🔖 {UI_STRINGS.TITLE}</h1>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block font-bold text-sm mb-1">📄 {UI_STRINGS.LABEL_TITLE}</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">📝 {UI_STRINGS.LABEL_DESCRIPTION}</label>
          <textarea
            className="textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">👤 {UI_STRINGS.LABEL_AUTHOR}</label>
          <p className="text-gray-500 text-sm font-mono">{resolveAuthorFromUrl(url)}</p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">🔗 {UI_STRINGS.LABEL_URL}</label>
          <p className="text-gray-500 text-xs font-mono truncate">{url}</p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-2">🏷️ {UI_STRINGS.LABEL_CATEGORIES}</label>
          <div className="border-2 border-black p-3 bg-gray-50 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1">
              {categories.map(cat => (
                <label key={cat} className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-300">
              <input
                type="text"
                className="input flex-1 text-sm"
                placeholder={UI_STRINGS.NEW_CATEGORY_PLACEHOLDER}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                disabled={isAddingCategory}
              />
              <button
                onClick={handleAddCategory}
                disabled={isAddingCategory}
                className="btn-secondary text-sm px-3"
              >
                {isAddingCategory ? '...' : UI_STRINGS.ADD_CATEGORY}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm font-mono">
            {error}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2 border-t-2 border-black">
          <button onClick={() => window.close()} className="btn-secondary">
            {UI_STRINGS.CANCEL}
          </button>
          <button onClick={handleSave} className="btn-primary">
            ✓ {UI_STRINGS.SAVE}
          </button>
        </div>
      </div>
    </div>
  );
}
