const STORAGE_KEYS = {
  fields: 'stcc_fields_v2',
  values: 'stcc_values_v2'
};

const FIXED_FIELDS = [
  { key: 'systemPrompt', label: '系统提示词', placeholder: '角色名之前的内容会被视作系统提示词。' },
  { key: 'name', label: '角色名', placeholder: '必填，例如：Eris', required: true }
];

const DEFAULT_OPTIONAL_FIELDS = [
  { key: 'description', label: '角色描述', placeholder: '例如：一位热衷于古代遗迹探索的学者。' },
  { key: 'personality', label: '性格标签', placeholder: '例如：理性、好奇、偶尔毒舌。' },
  { key: 'scenario', label: '初始场景', placeholder: '例如：在风暴夜的图书馆顶层。' },
  { key: 'firstMessage', label: '开场对白', placeholder: '例如：“你终于来了……”' },
  { key: 'exampleDialogues', label: '示例对话', placeholder: '例如：<START>\\n{{char}}: ...' }
];

const byId = (id) => document.querySelector(`#${id}`);
const grid = byId('card-grid');
const dialog = byId('editor-dialog');
const dialogTitle = byId('dialog-title');
const dialogTextarea = byId('dialog-textarea');
const importDialog = byId('import-dialog');
const importTextarea = byId('import-textarea');
const manageDialog = byId('manage-dialog');
const blockList = byId('block-list');
const uploadInput = byId('upload-input');
const formHint = byId('form-hint');

const exportBtn = byId('export-btn');
const downloadBtn = byId('download-btn');
const importBtn = byId('import-btn');
const uploadBtn = byId('upload-btn');
const manageBtn = byId('manage-btn');

let fields = loadFields();
let values = loadValues(fields);
let currentKey = null;

function sanitizeFilename(input) {
  return input.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'character-card';
}

function withTempText(button, text, fallbackText, duration = 1300) {
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = fallbackText;
  }, duration);
}

function makeCustomKey(label) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
  let key = `custom-${base}`;
  let index = 1;
  const existing = new Set(fields.map((f) => f.key));
  while (existing.has(key)) {
    index += 1;
    key = `custom-${base}-${index}`;
  }
  return key;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.fields, JSON.stringify(fields));
  localStorage.setItem(STORAGE_KEYS.values, JSON.stringify(values));
}

function ensureFixedFields(list) {
  const optional = list.filter((f) => !FIXED_FIELDS.some((fixed) => fixed.key === f.key));
  return [...FIXED_FIELDS, ...optional];
}

function loadFields() {
  const raw = localStorage.getItem(STORAGE_KEYS.fields);
  if (!raw) {
    return [...FIXED_FIELDS, ...DEFAULT_OPTIONAL_FIELDS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('invalid fields');
    }
    return ensureFixedFields(parsed);
  } catch {
    return [...FIXED_FIELDS, ...DEFAULT_OPTIONAL_FIELDS];
  }
}

function loadValues(currentFields) {
  const fallback = Object.fromEntries(currentFields.map((item) => [item.key, '']));
  const raw = localStorage.getItem(STORAGE_KEYS.values);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return Object.fromEntries(currentFields.map((item) => [item.key, parsed[item.key] || '']));
  } catch {
    return fallback;
  }
}

function buildLabelToFieldMap() {
  return Object.fromEntries(fields.map((field) => [field.label, field]));
}

function renderCards() {
  grid.innerHTML = '';
  const nameValue = values.name?.trim();
  formHint.classList.toggle('is-error', !nameValue);

  fields.forEach((field) => {
    const card = document.createElement('article');
    card.className = 'field-card';
    if (field.required && !nameValue) {
      card.classList.add('required-empty');
    }

    const title = document.createElement('h2');
    title.className = 'field-title';
    title.textContent = field.required ? `${field.label}（必填）` : field.label;

    const preview = document.createElement('p');
    preview.className = 'field-preview';

    const content = values[field.key]?.trim();
    if (content) {
      preview.textContent = content;
    } else {
      preview.textContent = field.placeholder || '点击编辑';
      preview.classList.add('is-placeholder');
    }

    card.append(title, preview);
    card.addEventListener('click', () => openEditor(field));
    grid.append(card);
  });
}

function openEditor(field) {
  currentKey = field.key;
  dialogTitle.textContent = `编辑：${field.label}`;
  dialogTextarea.value = values[field.key] ?? '';
  dialogTextarea.placeholder = field.placeholder || '';
  dialog.showModal();
  dialogTextarea.focus();
}

function saveField() {
  if (!currentKey) {
    return;
  }

  values[currentKey] = dialogTextarea.value.trim();
  saveState();
  dialog.close();
  currentKey = null;
  renderCards();
}

function validateRequiredName(showFeedback = true) {
  const ok = Boolean(values.name?.trim());
  if (!ok && showFeedback) {
    withTempText(exportBtn, '请先填写角色名', '复制 Markdown', 1500);
    withTempText(downloadBtn, '请先填写角色名', '下载 Markdown', 1500);
  }
  return ok;
}

function buildMarkdown() {
  return fields
    .map((field) => {
      const content = values[field.key]?.trim();
      if (!content) {
        return null;
      }
      return `## ${field.label}\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function parseMarkdown(markdownText) {
  const text = markdownText.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return { parsedValues: {}, parsedFields: [...fields] };
  }

  const lines = text.split('\n');
  const nameHeadingIndex = lines.findIndex((line) => /^##\s+角色名\s*$/.test(line.trim()));
  const parsedValues = {};

  if (nameHeadingIndex > 0) {
    const systemContent = lines.slice(0, nameHeadingIndex).join('\n').trim();
    if (systemContent) {
      parsedValues.systemPrompt = systemContent;
    }
  }

  const remainder = nameHeadingIndex >= 0 ? lines.slice(nameHeadingIndex).join('\n') : text;
  const sectionPattern = /^##\s+(.+)\n([\s\S]*?)(?=\n##\s+|$)/gm;
  const labelToField = buildLabelToFieldMap();
  const importFields = [...FIXED_FIELDS];

  let match = sectionPattern.exec(remainder);
  while (match) {
    const label = match[1].trim();
    const content = match[2].trim();

    let field = labelToField[label];
    if (!field) {
      field = { key: makeCustomKey(label), label, placeholder: '' };
    }

    if (!importFields.some((f) => f.key === field.key)) {
      importFields.push(field);
    }

    parsedValues[field.key] = content;
    match = sectionPattern.exec(remainder);
  }

  return { parsedValues, parsedFields: ensureFixedFields(importFields) };
}

function applyImportedData({ parsedValues, parsedFields }) {
  fields = parsedFields;
  values = Object.fromEntries(fields.map((field) => [field.key, parsedValues[field.key] || '']));
  saveState();
  renderCards();
}

async function exportMarkdown() {
  if (!validateRequiredName()) {
    return;
  }

  const markdown = buildMarkdown();
  if (!markdown) {
    withTempText(exportBtn, '无可复制内容', '复制 Markdown', 1200);
    return;
  }

  try {
    await navigator.clipboard.writeText(markdown);
    withTempText(exportBtn, '已复制到剪贴板', '复制 Markdown');
  } catch {
    dialogTitle.textContent = '无法写入剪贴板';
    dialogTextarea.value = markdown;
    dialog.showModal();
  }
}

function downloadMarkdown() {
  if (!validateRequiredName()) {
    return;
  }

  const markdown = buildMarkdown();
  if (!markdown) {
    withTempText(downloadBtn, '无可下载内容', '下载 Markdown', 1200);
    return;
  }

  const fileName = `${sanitizeFilename(values.name.trim())}.md`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  withTempText(downloadBtn, `已下载 ${fileName}`, '下载 Markdown');
}

async function openImportDialog() {
  importTextarea.value = '';

  try {
    const text = await navigator.clipboard.readText();
    if (text.trim()) {
      importTextarea.value = text;
    }
  } catch {
    // ignore clipboard errors
  }

  importDialog.showModal();
  importTextarea.focus();
}

function importMarkdown() {
  const imported = parseMarkdown(importTextarea.value);
  applyImportedData(imported);
  importDialog.close();
  withTempText(importBtn, '导入成功', '粘贴导入');
}

async function importMarkdownFile(file) {
  const text = await file.text();
  const imported = parseMarkdown(text);
  applyImportedData(imported);
  withTempText(uploadBtn, `已导入 ${file.name}`, '上传 .md', 1800);
}

function renderBlockManager() {
  blockList.innerHTML = '';

  fields.forEach((field, index) => {
    const row = document.createElement('div');
    row.className = 'block-row';

    const name = document.createElement('span');
    name.className = 'block-name';
    name.textContent = field.label;

    const actions = document.createElement('div');
    actions.className = 'block-actions';

    const canMove = index > 1;

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.textContent = '上移';
    upBtn.disabled = !canMove || index === 2;
    upBtn.addEventListener('click', () => moveField(index, index - 1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.textContent = '下移';
    downBtn.disabled = !canMove || index === fields.length - 1;
    downBtn.addEventListener('click', () => moveField(index, index + 1));

    actions.append(upBtn, downBtn);

    if (canMove) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        if (!window.confirm(`确认删除 block「${field.label}」？`)) {
          return;
        }
        fields = fields.filter((item) => item.key !== field.key);
        delete values[field.key];
        saveState();
        renderCards();
        renderBlockManager();
      });
      actions.append(deleteBtn);
    }

    row.append(name, actions);
    blockList.append(row);
  });
}

function moveField(from, to) {
  const next = [...fields];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  fields = ensureFixedFields(next);
  saveState();
  renderCards();
  renderBlockManager();
}

function addBlock() {
  const label = window.prompt('请输入新 block 名称');
  if (!label || !label.trim()) {
    return;
  }

  if (fields.some((field) => field.label === label.trim())) {
    window.alert('已存在同名 block');
    return;
  }

  const field = { key: makeCustomKey(label), label: label.trim(), placeholder: '' };
  fields.push(field);
  values[field.key] = '';
  saveState();
  renderCards();
  renderBlockManager();
}

byId('save-btn').addEventListener('click', saveField);
byId('cancel-btn').addEventListener('click', () => {
  dialog.close();
  currentKey = null;
});

dialog.addEventListener('cancel', () => {
  currentKey = null;
});

exportBtn.addEventListener('click', exportMarkdown);
downloadBtn.addEventListener('click', downloadMarkdown);
importBtn.addEventListener('click', openImportDialog);
uploadBtn.addEventListener('click', () => uploadInput.click());
manageBtn.addEventListener('click', () => {
  renderBlockManager();
  manageDialog.showModal();
});

byId('import-cancel-btn').addEventListener('click', () => importDialog.close());
byId('import-save-btn').addEventListener('click', importMarkdown);
byId('manage-close-btn').addEventListener('click', () => manageDialog.close());
byId('add-block-btn').addEventListener('click', addBlock);

uploadInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    await importMarkdownFile(file);
  } catch {
    withTempText(uploadBtn, '导入失败', '上传 .md', 1200);
  } finally {
    uploadInput.value = '';
  }
});

renderCards();
