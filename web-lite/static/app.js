/**
 * Playwright Agent - 自动化测试平台
 * 适配后端 API
 */

// ========== 状态管理 ==========
let currentProject = null;
let currentRunId = null;
let currentEnv = null;
let ws = null;

// 运行选项
let headlessMode = true;
let recordVideoMode = false;

// ========== 页面导航 ==========

function showProjectsPage() {
    document.getElementById('pageProjects').style.display = 'block';
    document.getElementById('pageSenarios').style.display = 'none';
    document.getElementById('btnBack').style.display = 'none';
    document.getElementById('pageTitle').textContent = 'Playwright Agent';
    document.getElementById('currentEnvIndicator').style.display = 'none';
    currentProject = null;
    if (ws) { ws.close(); ws = null; }
    loadProjects();
}

function enterProject(project) {
    currentProject = project;
    document.getElementById('pageProjects').style.display = 'none';
    document.getElementById('pageSenarios').style.display = 'flex';
    document.getElementById('btnBack').style.display = 'flex';
    document.getElementById('pageTitle').textContent = project.name;

    const envIndicator = document.getElementById('currentEnvIndicator');
    if (project.environments?.length > 0) {
        envIndicator.style.display = 'flex';
        currentEnv = project.environments[0].name;
        envIndicator.querySelector('.env-name').textContent = currentEnv;
    } else {
        envIndicator.style.display = 'none';
        currentEnv = null;
    }

    loadScenarios();
}

function goBackToProjects() {
    showProjectsPage();
}

// ========== 项目管理 ==========

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '<div class="projects-empty"><p>加载中...</p></div>';

    try {
        const res = await fetch('/api/projects');
        const projects = await res.json();

        if (!projects?.length) {
            grid.innerHTML = `
                <div class="projects-empty">
                    <h3>还没有项目</h3>
                    <p>创建您的第一个自动化测试项目</p>
                    <button class="btn-primary" onclick="showCreateProjectModal()">新建项目</button>
                </div>`;
            return;
        }

        grid.innerHTML = projects.map(p => `
            <div class="project-card" onclick='enterProject(${JSON.stringify(p)})'>
                <div class="project-card-header">
                    <span class="project-card-name">${p.name}</span>
                    <span class="project-card-time">${formatDate(p.updated_at || p.created_at)}</span>
                </div>
                <div class="project-card-desc">${p.description || '暂无描述'}</div>
                <div class="project-card-stats">
                    <div class="project-stat">${p.environments?.length || 0} 环境</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = `<div class="projects-empty"><h3>加载失败</h3><p>${e.message}</p></div>`;
    }
}

function showCreateProjectModal() {
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('createProjectModal').classList.add('show');
}

function closeCreateProjectModal() {
    document.getElementById('createProjectModal').classList.remove('show');
}

async function createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();

    if (!name) { alert('请输入项目名称'); return; }

    try {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: description || null })
        });

        if (res.ok) {
            closeCreateProjectModal();
            loadProjects();
        } else {
            const data = await res.json();
            alert(data.detail || '创建失败');
        }
    } catch (e) {
        alert('创建失败: ' + e.message);
    }
}

// ========== 场景管理 ==========

async function loadScenarios() {
    if (!currentProject) return;

    const list = document.getElementById('scenarioList');
    list.innerHTML = '<div class="scenario-empty">加载中...</div>';

    try {
        const res = await fetch(`/api/projects/${currentProject.id}/scenarios`);
        const scenarios = await res.json();

        if (!scenarios?.length) {
            list.innerHTML = '<div class="scenario-empty">暂无测试场景</div>';
            return;
        }

        list.innerHTML = scenarios.map(s => `
            <div class="scenario-item" id="scenario-${s.id}">
                <div class="scenario-info">
                    <h3>${s.name}</h3>
                    <p>${s.description || s.goal || ''}</p>
                </div>
                <button class="btn btn-primary" id="btn-${s.id}" onclick="showRunModal('${s.id}', '${s.name}')">运行</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<div class="scenario-empty">加载失败: ${e.message}</div>`;
    }
}

// ========== 运行测试 ==========

let pendingScenarioId = null;

function showRunModal(scenarioId, scenarioName) {
    pendingScenarioId = scenarioId;
    document.getElementById('modalScenarioName').textContent = `场景: ${scenarioName}`;
    document.getElementById('runModal').classList.add('show');
}

function closeRunModal() {
    document.getElementById('runModal').classList.remove('show');
    pendingScenarioId = null;
}

function toggleHeadless() {
    headlessMode = !headlessMode;
    document.getElementById('headlessToggle').classList.toggle('active', headlessMode);
}

function toggleRecordVideo() {
    recordVideoMode = !recordVideoMode;
    document.getElementById('recordVideoToggle').classList.toggle('active', recordVideoMode);
}

function toggleAutoSendDingtalk() {
    // 保留接口，暂不实现
}

async function confirmRun() {
    if (!pendingScenarioId || !currentProject) return;

    const scenarioId = pendingScenarioId;
    closeRunModal();

    const btn = document.getElementById(`btn-${scenarioId}`);
    if (btn) {
        btn.classList.remove('btn-primary', 'btn-success', 'btn-failed');
        btn.classList.add('btn-running');
        btn.innerHTML = '<span class="status-dot"></span> 运行中...';
        btn.disabled = true;
    }

    const logArea = document.getElementById('logArea');
    logArea.textContent = '正在启动测试...\n';

    try {
        const res = await fetch('/api/runner/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentProject.id,
                scenario_id: scenarioId,
                environment: currentEnv,
                headless: headlessMode,
                record_video: recordVideoMode
            })
        });

        const data = await res.json();

        if (res.ok && data.run_id) {
            currentRunId = data.run_id;
            logArea.textContent += `运行ID: ${data.run_id}\n\n`;
            connectWebSocket(data.run_id, scenarioId);
        } else {
            updateButton(scenarioId, 'failed', data.detail || '启动失败');
            logArea.textContent += `启动失败: ${data.detail || '未知错误'}\n`;
        }
    } catch (e) {
        updateButton(scenarioId, 'failed', e.message);
        logArea.textContent += `启动失败: ${e.message}\n`;
    }
}

function connectWebSocket(runId, scenarioId) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/api/runner/ws/${runId}`);

    const logArea = document.getElementById('logArea');

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'log') {
                logArea.textContent += data.message + '\n';
            } else if (data.type === 'step') {
                logArea.textContent += `[步骤 ${data.step_index + 1}] ${data.action}: ${data.status}\n`;
            } else if (data.type === 'complete') {
                updateButton(scenarioId, data.status === 'success' ? 'success' : 'failed', data.error);
                logArea.textContent += `\n=== 测试${data.status === 'success' ? '完成' : '失败'} ===\n`;
                if (data.error) logArea.textContent += data.error + '\n';
            }
            logArea.scrollTop = logArea.scrollHeight;
        } catch {
            logArea.textContent += event.data + '\n';
            logArea.scrollTop = logArea.scrollHeight;
        }
    };

    ws.onclose = () => {
        const btn = document.getElementById(`btn-${scenarioId}`);
        if (btn?.classList.contains('btn-running')) {
            pollRunStatus(runId, scenarioId);
        }
    };
}

async function pollRunStatus(runId, scenarioId) {
    try {
        const res = await fetch(`/api/runner/status/${runId}`);
        const data = await res.json();

        if (data.status === 'running') {
            setTimeout(() => pollRunStatus(runId, scenarioId), 2000);
        } else {
            updateButton(scenarioId, data.status === 'completed' ? 'success' : 'failed', data.error);
        }
    } catch {}
}

function updateButton(scenarioId, status, error) {
    const btn = document.getElementById(`btn-${scenarioId}`);
    if (!btn) return;

    btn.classList.remove('btn-primary', 'btn-running', 'btn-success', 'btn-failed');
    btn.disabled = false;

    if (status === 'success') {
        btn.classList.add('btn-success');
        btn.textContent = '✓ 成功';
    } else if (status === 'failed') {
        btn.classList.add('btn-failed');
        btn.textContent = '✗ 失败';
    } else {
        btn.classList.add('btn-primary');
        btn.textContent = '运行';
    }
}

// ========== 历史记录 ==========

function showHistoryModal() {
    document.getElementById('historyModal').classList.add('show');
    loadHistoryLogs();
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('show');
}

async function loadHistoryLogs() {
    const listEl = document.getElementById('historyList');
    listEl.innerHTML = '<div class="history-empty">加载中...</div>';

    if (!currentProject) {
        listEl.innerHTML = '<div class="history-empty">请先选择项目</div>';
        return;
    }

    try {
        const res = await fetch(`/api/runner/list?project_id=${currentProject.id}&limit=50`);
        const data = await res.json();

        if (!data.runs?.length) {
            listEl.innerHTML = '<div class="history-empty">暂无运行记录</div>';
            return;
        }

        listEl.innerHTML = data.runs.map(run => `
            <div class="history-file-item" onclick="loadRunResult('${run.run_id}', this)">
                <div class="file-time">${formatDateTime(run.started_at)}</div>
                <div class="file-scenario">${run.scenario_name || run.scenario_id}</div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="history-empty">加载失败: ${e.message}</div>`;
    }
}

async function loadRunResult(runId, element) {
    document.querySelectorAll('.history-file-item').forEach(el => el.classList.remove('active'));
    element?.classList.add('active');

    const contentEl = document.getElementById('historyLogContent');
    contentEl.textContent = '加载中...';

    try {
        const res = await fetch(`/api/runner/result/${runId}`);
        const data = await res.json();

        let text = `运行ID: ${runId}\n状态: ${data.status}\n`;
        if (data.steps) {
            text += '\n步骤:\n';
            data.steps.forEach((s, i) => {
                text += `  ${i + 1}. ${s.action}: ${s.status}${s.error ? ' - ' + s.error : ''}\n`;
            });
        }
        if (data.error) text += `\n错误: ${data.error}\n`;
        contentEl.textContent = text;
    } catch (e) {
        contentEl.textContent = `加载失败: ${e.message}`;
    }
}

// ========== 设置弹窗 ==========

function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
    loadEnvSettings();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function loadEnvSettings() {
    if (!currentProject?.environments) return;

    const container = document.querySelector('.settings-env-toggle');
    if (!container) return;

    container.innerHTML = currentProject.environments.map(env => `
        <button class="settings-env-btn ${env.name === currentEnv ? 'active' : ''}"
                data-env="${env.name}" onclick="setEnv('${env.name}')">
            <span class="env-dot"></span>
            <span class="env-label">${env.name}</span>
        </button>
    `).join('');
}

function setEnv(env) {
    currentEnv = env;
    document.getElementById('currentEnvIndicator').querySelector('.env-name').textContent = env;
    document.querySelectorAll('.settings-env-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.env === env);
    });
}

// ========== 工具函数 ==========

function formatDate(str) {
    if (!str) return '-';
    return new Date(str).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatDateTime(str) {
    if (!str) return '-';
    return new Date(str).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}

// ========== 保留的空接口 ==========

function switchView() {}
function closeVideoModal() { document.getElementById('videoModal').classList.remove('show'); }
function showAddScheduleForm() {}
function cancelScheduleForm() {}
function showUploadToken() {}
function cancelUploadToken() {}
function sendHistoryReport() {}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', showProjectsPage);
