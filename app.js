const fieldConfig = [
  { key: 'name', label: '角色名称', placeholder: '示例：Eris / 夜行档案员 / 代号-07' },
  { key: 'description', label: '角色描述', placeholder: '示例：外表、身份背景、说话风格、核心动机。' },
  { key: 'personality', label: '性格标签', placeholder: '示例：理性、克制、谨慎、偶尔黑色幽默。' },
  { key: 'scenario', label: '初始场景', placeholder: '示例：你们在雨夜的旧书库相遇，她正整理失窃档案。' },
  { key: 'firstMessage', label: '开场对白', placeholder: '示例：“你来了。门已经反锁，先听我说三十秒。”' },
  { key: 'exampleDialogues', label: '示例对话', placeholder: '示例：\n<START>\n{{char}}: 先确认你的目标。\n{{user}}: 我想找到那份名单。' },
  { key: 'systemPrompt', label: '系统提示（可选）', placeholder: '示例：确保角色不跳设定，语气稳定，不代替用户行动。' },
  { key: 'creatorNotes', label: '作者备注（可选）', placeholder: '示例：剧情推进到第二章后可揭示真实身份。' }
];

const values = Object.fromEntries(fieldConfig.map((item) => [item.key, '']));
const labelToKey = Object.fromEntries(fieldConfig.map((item) => [item.label, item.key]));
const grid = document.querySelector('#card-grid');
const dialog = document.querySelector('#editor-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogTextarea = document.querySelector('#dialog-textarea');
const exportBtn = document.querySelector('#export-btn');
const importBtn = document.querySelector('#import-btn');
const downloadBtn = document.querySelector('#download-btn');

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

    const currentValue = values[field.key]?.trim();
    if (currentValue) {
      preview.textContent = currentValue;
    } else {
      preview.textContent = field.placeholder;
      preview.classList.add('placeholder');
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
  if (!currentKey) return;

  values[currentKey] = dialogTextarea.value.trim();
  dialog.close();
  currentKey = null;
  renderCards();
}

function buildMarkdown() {
  return fieldConfig
    .map((field) => {
      const content = values[field.key]?.trim() || '（留空）';
      return `## ${field.label}\n${content}`;
    })
    .join('\n\n');
}

function parseMarkdown(markdownText) {
  const normalized = markdownText.replace(/\r\n/g, '\n').trim();
  const sections = normalized.matchAll(/^##\s+(.+?)\n([\s\S]*?)(?=\n##\s+|$)/gm);

  let importedCount = 0;

  for (const section of sections) {
    const label = section[1].trim();
    const content = section[2].trim();
    const key = labelToKey[label];

    if (!key) continue;

    values[key] = content === '（留空）' ? '' : content;
    importedCount += 1;
  }

  return importedCount;
}

async function importFromClipboard() {
  let text = '';

  try {
    text = await navigator.clipboard.readText();
  } catch {
    alert('读取剪贴板失败，请确认浏览器已授予剪贴板读取权限。');
    return;
  }

  if (!text.trim()) {
    alert('剪贴板为空，未导入内容。');
    return;
  }

  const importedCount = parseMarkdown(text);

  if (!importedCount) {
    alert('未识别到可导入的 Markdown 字段，请确认格式为“## 字段名 + 内容”。');
    return;
  }

  renderCards();
  importBtn.textContent = `已导入 ${importedCount} 项`;
  setTimeout(() => {
    importBtn.textContent = '粘贴导入';
  }, 1300);
}

async function exportMarkdown() {
  const markdown = buildMarkdown();

  try {
    await navigator.clipboard.writeText(markdown);
    exportBtn.textContent = '已复制到剪贴板';
  } catch {
    dialogTitle.textContent = '无法写入剪贴板';
    dialogTextarea.value = markdown;
    dialogTextarea.placeholder = '';
    dialog.showModal();
    return;
  }

  setTimeout(() => {
    exportBtn.textContent = '复制 Markdown';
  }, 1300);
}

function downloadMarkdown() {
  const markdown = buildMarkdown();
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'sillytavern-card.md';
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  downloadBtn.textContent = '已下载';
  setTimeout(() => {
    downloadBtn.textContent = '下载 Markdown';
  }, 1300);
}

document.querySelector('#save-btn').addEventListener('click', saveField);
document.querySelector('#cancel-btn').addEventListener('click', () => {
  dialog.close();
  currentKey = null;
});

dialog.addEventListener('cancel', () => {
  currentKey = null;
});

importBtn.addEventListener('click', importFromClipboard);
exportBtn.addEventListener('click', exportMarkdown);
downloadBtn.addEventListener('click', downloadMarkdown);

renderCards();
