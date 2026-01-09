# Playwright Agent

AI 自动化测试平台，基于 Python Playwright + DSL 的浏览器自动化执行引擎，配合 React 前端进行可视化管理。

## 功能特性

- **项目管理**: 创建项目，配置多环境（dev/test/prod）
- **UI Map 管理**: 定义页面元素选择器，支持主选择器 + 备用选择器
- **场景管理**: 可视化编辑测试步骤，支持步骤选项（失败时继续、可选步骤、超时设置）
- **实时执行**: WebSocket 实时推送执行状态和截图
- **执行历史**: 查看历史运行记录、步骤详情、网络请求日志
- **视频录制**: 可选录制测试执行视频
- **国际化**: 支持中英文切换

## 技术栈

**后端**
- Python 3.10+
- FastAPI + WebSocket
- Playwright (浏览器自动化)

**前端**
- React 18 + TypeScript
- Vite
- TanStack Query
- shadcn/ui + Tailwind CSS

## 快速开始

### 后端

```bash
# 安装依赖
pip install -r requirements.txt
python -m playwright install

# 启动服务
cd server
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
├── server/                 # 后端服务
│   ├── api/               # API 路由
│   │   ├── project.py     # 项目管理
│   │   ├── ui_map.py      # UI Map 管理
│   │   ├── scenario.py    # 场景管理
│   │   └── runner.py      # 执行器 WebSocket
│   ├── core/
│   │   └── executor.py    # Playwright 执行引擎
│   └── main.py            # FastAPI 入口
├── web/                    # 前端
│   └── src/
│       ├── components/    # 组件
│       ├── pages/         # 页面
│       ├── hooks/         # 自定义 Hooks
│       ├── api/           # API 客户端
│       └── i18n/          # 国际化
├── samples/               # 示例文件
└── requirements.txt
```

## DSL 动作

| Action | 说明 | 参数 |
|--------|------|------|
| `goto` | 跳转页面 | `url` |
| `click` | 点击元素 | `target` |
| `fill` | 填充输入框 | `target`, `value` |
| `type` | 逐字输入 | `target`, `value` |
| `wait_for` | 等待元素可见 | `target` |
| `assert_text` | 断言文本 | `target`, `value` |
| `hover` | 悬停 | `target` |
| `dblclick` | 双击 | `target` |
| `select` | 下拉选择 | `target`, `value` |
| `press` | 按键 | `target`, `value` |
| `scroll` | 滚动到可见 | `target` |
| `wait` | 等待指定时间 | `value` (ms) |
| `run_js` | 执行 JavaScript | `value` |
| `screenshot` | 截图 | - |

## 步骤选项

每个步骤可配置以下选项：

- **失败时继续** (`continue_on_error`): 该步骤失败后继续执行后续步骤
- **可选步骤** (`optional`): 该步骤失败不会将整个运行标记为失败
- **超时时间** (`timeout`): 自定义该步骤的超时时间（毫秒）

## License

MIT
