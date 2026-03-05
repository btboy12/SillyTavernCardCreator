const fieldConfig = [
  { key: 'name', label: '角色名称', value: 'Eris' },
  { key: 'description', label: '角色描述', value: '一位热衷于古代遗迹探索的学者，喜欢用幽默化解紧张气氛。' },
  { key: 'personality', label: '性格标签', value: '理性、好奇、偶尔毒舌，但会照顾同伴。' },
  { key: 'scenario', label: '初始场景', value: '在风暴夜的图书馆顶层，你和她围着一张摊满地图的木桌讨论下一站。' },
  { key: 'firstMessage', label: '开场对白', value: '“你终于来了，我刚刚破解了石碑上的最后一行谜语。”' },
  { key: 'exampleDialogues', label: '示例对话', value: '<START>\n{{char}}: 先别急着下结论。\n{{user}}: 你发现了什么？\n{{char}}: 墙上的划痕是新留下的。' },
  { key: 'systemPrompt', label: '系统提示（可选）', value: '保持角色口吻稳定，避免跳出设定。' },
  { key: 'creatorNotes', label: '作者备注（可选）', value: '可根据剧情推进逐步揭示角色过去。' }
];

const values = Object.fromEntries(fieldConfig.map((item) => [item.key, item.value]));
const grid = document.querySelector('#card-grid');
const dialog = document.querySelector('#editor-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogTextarea = document.querySelector('#dialog-textarea');
const exportBtn = document.querySelector('#export-btn');

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
    preview.textContent = values[field.key] || '（点击编辑）';

    card.append(title, preview);
    card.addEventListener('click', () => openEditor(field));
    grid.append(card);
  });
}

function openEditor(field) {
  currentKey = field.key;
  dialogTitle.textContent = `编辑：${field.label}`;
  dialogTextarea.value = values[field.key] ?? '';
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
      const content = values[field.key]?.trim() || '（留空）';
      return `## ${field.label}\n${content}`;
    })
    .join('\n\n');
}

async function exportMarkdown() {
  const markdown = buildMarkdown();

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

document.querySelector('#save-btn').addEventListener('click', saveField);
document.querySelector('#cancel-btn').addEventListener('click', () => {
  dialog.close();
  currentKey = null;
});

dialog.addEventListener('cancel', () => {
  currentKey = null;
});

exportBtn.addEventListener('click', exportMarkdown);

renderCards();
