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
  const normalized = markdown.replace(/\r\n/g, '\n');

  fieldConfig.forEach((field, index) => {
    const escapedLabel = field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextLabels = fieldConfig
      .slice(index + 1)
      .map((item) => item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const endPattern = nextLabels.length ? `(?=\\n## (?:${nextLabels.join('|')})\\s*\\n|$)` : '$';
    const pattern = new RegExp(`## ${escapedLabel}\\s*\\n([\\s\\S]*?)${endPattern}`);
    const match = normalized.match(pattern);

    if (match) {
      result[field.key] = match[1].trim();
    }
  });

  return result;
}

async function exportMarkdown() {
  const markdown = buildMarkdown();
  if (!markdown) {
    exportBtn.textContent = '无可复制内容';
    setTimeout(() => {
      exportBtn.textContent = '复制 Markdown';
    }, 1200);
    return;
  }

  try {
    await navigator.clipboard.writeText(markdown);
    exportBtn.textContent = '已复制到剪贴板';
  } catch {
    dialogTitle.textContent = '无法写入剪贴板';
    dialogTextarea.value = markdown;
    dialog.showModal();
    return;
  }

  setTimeout(() => {
    exportBtn.textContent = '复制 Markdown';
  }, 1300);
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
