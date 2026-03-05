const fieldConfig = [
  { key: 'name', label: '角色名称', placeholder: '例如：Eris' },
  {
    key: 'description',
    label: '角色描述',
    placeholder: '例如：一位热衷于古代遗迹探索的学者，喜欢用幽默化解紧张气氛。'
  },
  { key: 'personality', label: '性格标签', placeholder: '例如：理性、好奇、偶尔毒舌，但会照顾同伴。' },
  {
    key: 'scenario',
    label: '初始场景',
    placeholder: '例如：在风暴夜的图书馆顶层，你和她围着一张摊满地图的木桌讨论下一站。'
  },
  { key: 'firstMessage', label: '开场对白', placeholder: '例如：“你终于来了，我刚刚破解了石碑上的最后一行谜语。”' },
  {
    key: 'exampleDialogues',
    label: '示例对话',
    placeholder: '例如：<START>\\n{{char}}: 先别急着下结论。\\n{{user}}: 你发现了什么？\\n{{char}}: 墙上的划痕是新留下的。'
  },
  { key: 'systemPrompt', label: '系统提示（可选）', placeholder: '例如：保持角色口吻稳定，避免跳出设定。' },
  { key: 'creatorNotes', label: '作者备注（可选）', placeholder: '例如：可根据剧情推进逐步揭示角色过去。' }
];

const values = Object.fromEntries(fieldConfig.map((item) => [item.key, '']));
const labelToKey = Object.fromEntries(fieldConfig.map((field) => [field.label, field.key]));

const grid = document.querySelector('#card-grid');
const dialog = document.querySelector('#editor-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogTextarea = document.querySelector('#dialog-textarea');
const exportBtn = document.querySelector('#export-btn');
const downloadBtn = document.querySelector('#download-btn');
const importBtn = document.querySelector('#import-btn');
const importDialog = document.querySelector('#import-dialog');
const importTextarea = document.querySelector('#import-textarea');

let currentKey = null;

function withTempText(button, text, fallbackText, duration = 1300) {
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = fallbackText;
  }, duration);
}

function renderCards() {
  grid.innerHTML = '';

  fieldConfig.forEach((field) => {
    const card = document.createElement('article');
    card.className = 'field-card';
    card.dataset.key = field.key;

    const title = document.createElement('h2');
    title.className = 'field-title';
    title.textContent = field.label;

    const preview = document.createElement('p');
    preview.className = 'field-preview';

    const content = values[field.key]?.trim();
    if (content) {
      preview.textContent = content;
    } else {
      preview.textContent = field.placeholder;
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
  dialogTextarea.placeholder = field.placeholder;
  dialog.showModal();
  dialogTextarea.focus();
}

function saveField() {
  if (!currentKey) {
    return;
  }

  values[currentKey] = dialogTextarea.value.trim();
  dialog.close();
  currentKey = null;
  renderCards();
}

function buildMarkdown() {
  return fieldConfig
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

function parseMarkdown(markdown) {
  const result = {};
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const sectionPattern = /^##\s+(.+)\n([\s\S]*?)(?=\n##\s+|$)/gm;

  let match = sectionPattern.exec(normalized);
  while (match) {
    const label = match[1].trim();
    const key = labelToKey[label];

    if (key) {
      result[key] = match[2].trim();
    }

    match = sectionPattern.exec(normalized);
  }

  return result;
}

function applyImportedValues(parsed) {
  let count = 0;

  fieldConfig.forEach((field) => {
    const nextValue = parsed[field.key] || '';
    values[field.key] = nextValue;
    if (nextValue) {
      count += 1;
    }
  });

  renderCards();
  return count;
}

async function exportMarkdown() {
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
  const markdown = buildMarkdown();
  if (!markdown) {
    withTempText(downloadBtn, '无可下载内容', '下载 Markdown', 1200);
    return;
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);

  link.href = objectUrl;
  link.download = 'character-card.md';
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  withTempText(downloadBtn, '已下载', '下载 Markdown');
}

async function openImportDialog() {
  importTextarea.value = '';

  try {
    const text = await navigator.clipboard.readText();
    const parsed = parseMarkdown(text);
    const importedCount = applyImportedValues(parsed);

    if (importedCount > 0) {
      withTempText(importBtn, `已导入 ${importedCount} 项`, '粘贴导入');
      return;
    }

    importTextarea.value = text;
  } catch {
    // 忽略剪贴板读取失败
  }

  importDialog.showModal();
  importTextarea.focus();
}

function importMarkdown() {
  const parsed = parseMarkdown(importTextarea.value);
  const importedCount = applyImportedValues(parsed);

  if (importedCount === 0) {
    withTempText(importBtn, '未识别到字段', '粘贴导入', 1500);
    return;
  }

  importDialog.close();
  withTempText(importBtn, `已导入 ${importedCount} 项`, '粘贴导入');
}

function downloadMarkdown() {
  const markdown = buildMarkdown();
  if (!markdown) {
    downloadBtn.textContent = '无可下载内容';
    setTimeout(() => {
      downloadBtn.textContent = '下载 Markdown';
    }, 1200);
    return;
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'character-card.md';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function openImportDialog() {
  importTextarea.value = '';

  try {
    const text = await navigator.clipboard.readText();
    if (text.includes('## ')) {
      importTextarea.value = text;
    }
  } catch {
    // 忽略剪贴板读取失败
  }

  importDialog.showModal();
  importTextarea.focus();
}

function importMarkdown() {
  const parsed = parseMarkdown(importTextarea.value);

  fieldConfig.forEach((field) => {
    values[field.key] = parsed[field.key] || '';
  });

  importDialog.close();
  renderCards();
}

document.querySelector('#save-btn').addEventListener('click', saveField);
document.querySelector('#cancel-btn').addEventListener('click', () => {
  dialog.close();
  currentKey = null;
});

dialog.addEventListener('cancel', () => {
  currentKey = null;
});

exportBtn.addEventListener('click', exportMarkdown);
downloadBtn.addEventListener('click', downloadMarkdown);
importBtn.addEventListener('click', openImportDialog);
document.querySelector('#import-cancel-btn').addEventListener('click', () => importDialog.close());
document.querySelector('#import-save-btn').addEventListener('click', importMarkdown);

renderCards();
