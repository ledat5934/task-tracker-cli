#!/usr/bin/env node
'use strict';

/**
 * task-cli.js
 * Simple task tracker CLI using a JSON file (task.json) in the same folder.
 * Commands:
 *   add <name> [description...]
 *   update <id> <description...>
 *   delete <id>
 *   mark-in-progress <id>
 *   mark-done <id>
 *   list [todo|in-progress|done]
 *   help
 */

const fs = require('fs');
const path = require('path');

// Sử dụng biến môi trường DATA_DIR hoặc mặc định là thư mục hiện tại
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'task.json'); // file lưu dữ liệu

// ---------- Utilities for read/write ----------

/** đọc tasks từ file trả về mảng (nếu lỗi trả về []) */
function loadTasks() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Warning: không đọc được file tasks (khởi tạo mới). Lỗi:', err.message);
    return [];
  }
}

/** ghi mảng tasks vào file */
function saveTasks(tasks) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error: không thể ghi file tasks:', err.message);
    process.exit(1);
  }
}

/** tìm id mới = max(existing ids) + 1 hoặc 1 nếu rỗng */
function getNextId(tasks) {
  const ids = tasks
    .map(t => Number(t.id))
    .filter(n => Number.isInteger(n) && n > 0);
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

/** in 1 task ra console với định dạng dễ đọc */
function printTask(t) {
  // hiển thị description nếu có
  const desc = t.description ? ` — ${t.description}` : '';
  console.log(
    `[${t.id}] ${t.name}${desc} | ${t.status} | created: ${t.createdAt} | updated: ${t.updatedAt}`
  );
}

// ---------- Command implementations ----------

function cmdAdd(args) {
  if (!args || args.length === 0) {
    console.error('Usage: add <name> [description...]');
    process.exit(1);
  }
  // Hỗ trợ: nếu chỉ 1 arg thì dùng làm name; nếu nhiều args thì arg0 = name, còn lại nối thành description
  const name = args[0];
  const description = args.length > 1 ? args.slice(1).join(' ') : '';

  const tasks = loadTasks();
  const id = getNextId(tasks);
  const now = new Date().toISOString();

  const task = {
    id,
    name,
    description,
    status: 'todo',
    createdAt: now,
    updatedAt: now
  };

  tasks.push(task);
  saveTasks(tasks);
  console.log(`Task added successfully (ID: ${id})`);
}

function cmdUpdate(args) {
  if (!args || args.length < 2) {
    console.error('Usage: update <id> <description...>');
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (Number.isNaN(id)) {
    console.error('Error: id không hợp lệ');
    process.exit(1);
  }
  const newDesc = args.slice(1).join(' ');
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => Number(t.id) === id);
  if (idx === -1) {
    console.error(`Error: không tìm thấy task với id ${id}`);
    process.exit(1);
  }
  tasks[idx].description = newDesc;
  tasks[idx].updatedAt = new Date().toISOString();
  saveTasks(tasks);
  console.log(`Task ${id} updated`);
}

function cmdDelete(args) {
  if (!args || args.length < 1) {
    console.error('Usage: delete <id>');
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (Number.isNaN(id)) {
    console.error('Error: id không hợp lệ');
    process.exit(1);
  }
  let tasks = loadTasks();
  const beforeLen = tasks.length;
  tasks = tasks.filter(t => Number(t.id) !== id);
  if (tasks.length === beforeLen) {
    console.error(`Error: không tìm thấy task với id ${id}`);
    process.exit(1);
  }
  saveTasks(tasks);
  console.log(`Task ${id} deleted`);
}

function cmdMark(args, newStatus) {
  if (!args || args.length < 1) {
    console.error(`Usage: ${newStatus === 'done' ? 'mark-done' : 'mark-in-progress'} <id>`);
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (Number.isNaN(id)) {
    console.error('Error: id không hợp lệ');
    process.exit(1);
  }
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => Number(t.id) === id);
  if (idx === -1) {
    console.error(`Error: không tìm thấy task với id ${id}`);
    process.exit(1);
  }
  tasks[idx].status = newStatus;
  tasks[idx].updatedAt = new Date().toISOString();
  saveTasks(tasks);
  console.log(`Task ${id} marked as ${newStatus}`);
}

function cmdList(args) {
  const filter = args && args.length ? args[0] : null; // 'todo' | 'in-progress' | 'done' | null
  const allowed = ['todo', 'in-progress', 'done'];
  if (filter && !allowed.includes(filter)) {
    console.error('Usage: list [todo|in-progress|done]');
    process.exit(1);
  }
  const tasks = loadTasks();
  const toPrint = filter ? tasks.filter(t => t.status === filter) : tasks;
  if (toPrint.length === 0) {
    console.log('Không có task nào để hiển thị.');
    return;
  }
  toPrint.forEach(printTask);
}

function printHelp() {
  console.log(`Task CLI — usage:
  add <name> [description...]        Add a new task (name required)
  update <id> <description...>       Update task description
  delete <id>                        Delete a task
  mark-in-progress <id>              Mark a task as in-progress
  mark-done <id>                     Mark a task as done
  list [todo|in-progress|done]       List tasks (optionally filter by status)
  help                               Show this help
Examples:
  node task-cli.js add "Buy groceries" "Eggs, milk, bread"
  node task-cli.js update 1 "Buy groceries and cook dinner"
  node task-cli.js mark-in-progress 1
  node task-cli.js mark-done 1
  node task-cli.js list in-progress
`);
}

// ---------- main: parse CLI args ----------
function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = argv.slice(1);

  switch (command) {
    case 'add':
      cmdAdd(args);
      break;
    case 'update':
      cmdUpdate(args);
      break;
    case 'delete':
      cmdDelete(args);
      break;
    case 'mark-in-progress':
      cmdMark(args, 'in-progress');
      break;
    case 'mark-done':
      cmdMark(args, 'done');
      break;
    case 'list':
      cmdList(args);
      break;
    case 'help':
    case undefined:
    case '':
      printHelp();
      break;
    default:
      console.error('Unknown command:', command);
      printHelp();
      process.exit(1);
  }
}

main();
