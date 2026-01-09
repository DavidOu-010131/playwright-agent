# Python Playwright Agent POC

最小可运行的 Python 版 Playwright + DSL Agent 验证，内置本地静态页面示例，无需外网即可跑通。

## 快速开始
1. 准备环境（建议 Python 3.10+，虚拟环境可选）：
   ```bash
   pip install -r requirements.txt
   python -m playwright install
   ```
2. 运行示例场景（默认无头模式，会在 `artifacts/` 下生成截图）：
   ```bash
   python agent_runner.py samples/scenario.json samples/ui_map.yaml
   ```
   若想看真实浏览器窗口，加 `--headed`；指定截图目录可用 `--artifacts my_run/`。

## 目录与文件
- `agent_runner.py`：读取 DSL（JSON 场景 + YAML UI Map），执行 `goto/click/type/wait_for/assert_text`，每步截图并日志输出。
- `samples/sample_page.html`：本地示例页面，包含输入框、发送按钮、消息列表，用于离线验证。
- `samples/ui_map.yaml`：元素定位信息，包含主定位与兜底选择器。
- `samples/scenario.json`：示例场景：打开页面、输入「Hello Playwright」、点击发送、断言消息出现。
- `requirements.txt`：依赖列表。

## DSL 说明（最小子集）
- 支持动作：`goto`（url）、`click`（target）、`type`（target,value）、`fill`、`wait_for`（可见）、`assert_text`（包含指定文本）。
- URL 若非 `http/https/file`，视为相对路径，自动解析为 `file://<绝对路径>` 方便本地文件。
- UI Map 结构：
  ```yaml
  elements:
    send_button:
      primary: "[data-test='send-btn']"
      fallbacks:
        - "#send-btn"
  ```
- 每步可选 `timeout`（毫秒），否则使用默认 `--timeout`（5000ms）。

## 可能的下一步扩展
- 增加更多动作（下拉选择、文件上传、网络拦截等）。
- 为 LLM 生成 DSL 加入系统提示与 few-shot 示例。
- 引入运行报告汇总（步骤结果、控制台日志、trace）并返回给 LLM 分析。
