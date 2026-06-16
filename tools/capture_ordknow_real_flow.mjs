import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const baseUrl = process.env.ORDKNOW_BASE_URL || "https://ordknow.vercel.app";
const email = process.env.ORDKNOW_TEST_EMAIL || "test@ordknow.com";
const password = process.env.ORDKNOW_TEST_PASSWORD || "test123456";
const outDir = process.env.ORDKNOW_SCREENSHOT_DIR || "D:/OrdKnow/docs/evidence/screenshots";
const logPath = process.env.ORDKNOW_FLOW_LOG || "D:/OrdKnow/docs/evidence/real_flow.log";
const profileDir = process.env.ORDKNOW_CHROME_PROFILE || "D:/OrdKnow/.tmp-chrome-profile";
const port = Number(process.env.ORDKNOW_CDP_PORT || 9333);

await mkdir(outDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true }).catch(() => null);

const notes = [];

function note(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  notes.push(line);
  console.log(line);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // Chrome may still be starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}: ${JSON.stringify(msg.error.data || "")}`));
      else resolve(msg.result || {});
      return;
    }
    if (msg.method && events.has(msg.method)) {
      for (const resolve of events.get(msg.method)) resolve(msg.params || {});
      events.delete(msg.method);
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(payload);
    });
  }

  function once(method, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const wrapped = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      if (!events.has(method)) events.set(method, []);
      events.get(method).push(wrapped);
    });
  }

  return { send, once, close: () => ws.close() };
}

function jsString(value) {
  return JSON.stringify(value);
}

async function evaluate(cdp, expression, timeout = 15000) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result?.value;
}

async function currentUrl(cdp) {
  return evaluate(cdp, "location.href", 5000);
}

async function bodyText(cdp) {
  return evaluate(cdp, "document.body ? document.body.innerText : ''", 5000);
}

async function goto(cdp, path, label) {
  const target = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const load = cdp.once("Page.loadEventFired", 45000).catch(() => null);
  const res = await cdp.send("Page.navigate", { url: target });
  await load;
  await delay(900);
  note(`${label}: ${target} -> frame=${res.frameId || "n/a"} url=${await currentUrl(cdp)}`);
}

async function waitForUrl(cdp, expected, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const url = await currentUrl(cdp).catch(() => "");
    if (expected.test(url)) return url;
    await delay(500);
  }
  return currentUrl(cdp).catch(() => "");
}

async function waitForLoginOutcome(cdp, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const url = await currentUrl(cdp).catch(() => "");
    const text = await bodyText(cdp).catch(() => "");
    if (url.includes("/workspace")) return { ok: true, url, text };
    if (/Invalid|fetch failed|登录失败|Email not confirmed|密码|错误|failed/i.test(text) && !text.includes("登录中...")) {
      return { ok: false, url, text };
    }
    await delay(800);
  }
  return { ok: false, url: await currentUrl(cdp).catch(() => ""), text: await bodyText(cdp).catch(() => "") };
}

async function waitForExpression(cdp, expression, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await evaluate(cdp, expression, 5000).catch(() => false);
    if (ok) return true;
    await delay(800);
  }
  return false;
}

async function capture(cdp, name, label) {
  await delay(600);
  const metrics = await cdp.send("Page.getLayoutMetrics").catch(() => null);
  const contentSize = metrics?.contentSize || { x: 0, y: 0, width: 1440, height: 960 };
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: {
      x: contentSize.x || 0,
      y: contentSize.y || 0,
      width: Math.min(Math.max(contentSize.width || 1440, 900), 2200),
      height: Math.min(Math.max(contentSize.height || 960, 700), 2600),
      scale: 1,
    },
  });
  const path = join(outDir, name);
  await writeFile(path, Buffer.from(result.data, "base64"));
  note(`${label}: ${path}`);
}

async function clickText(cdp, text) {
  return evaluate(
    cdp,
    `(() => {
      const text = ${jsString(text)};
      const nodes = [...document.querySelectorAll('button,a,label')];
      const el = nodes.find((n) => (n.innerText || n.textContent || '').trim().includes(text));
      if (!el) return false;
      el.click();
      return true;
    })()`,
  );
}

async function clickExactText(cdp, text) {
  return evaluate(
    cdp,
    `(() => {
      const text = ${jsString(text)};
      const nodes = [...document.querySelectorAll('button,a,label')];
      const el = nodes.find((n) => (n.innerText || n.textContent || '').trim() === text);
      if (!el) return false;
      el.click();
      return true;
    })()`,
  );
}

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-dev-shm-usage",
  "--window-size=1440,960",
  "about:blank",
], { stdio: "ignore", detached: false });

let cdp;

try {
  note(`Base URL: ${baseUrl}`);
  note(`Chrome PID: ${chrome.pid}`);
  const list = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const pageTarget = list.find((item) => item.type === "page") || list[0];
  cdp = await connect(pageTarget.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await goto(cdp, "/login", "打开登录页");
  await capture(cdp, "real_01_login_before.png", "登录前页面截图");

  await evaluate(
    cdp,
    `(() => {
      const setValue = (el, value) => {
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const form = [...document.querySelectorAll('form')].find((f) => (f.innerText || '').includes('登录'));
      if (!form) return 'login-form-missing';
      const emailOk = setValue(form.querySelector('input[name="email"]'), ${jsString(email)});
      const passwordOk = setValue(form.querySelector('input[name="password"]'), ${jsString(password)});
      return { emailOk, passwordOk, values: [...form.querySelectorAll('input')].map((i) => ({ name: i.name, type: i.type, value: i.value })) };
    })()`,
  );
  await capture(cdp, "real_01_login_filled.png", "登录表单填写后截图");
  await evaluate(
    cdp,
    `(() => {
      const form = [...document.querySelectorAll('form')].find((f) => (f.innerText || '').includes('登录'));
      if (!form) return 'login-form-missing';
      const btn = [...form.querySelectorAll('button')].find((b) => b.innerText.trim() === '登录');
      if (!btn) return 'login-button-missing';
      btn.click();
      return 'submitted';
    })()`,
  );
  const outcome = await waitForLoginOutcome(cdp, 60000);
  const afterLoginUrl = outcome.url;
  note(`登录提交后 URL: ${afterLoginUrl}`);
  await delay(1200);
  await capture(cdp, "real_02_login_result.png", "登录结果截图");

  if (!outcome.ok) {
    note(`登录未进入工作台，页面文本摘要: ${outcome.text.slice(0, 600).replace(/\s+/g, " ")}`);
    throw new Error("Login did not reach /workspace");
  }

  await capture(cdp, "real_03_workspace_initial.png", "工作台初始截图");

  const materialTitle = `测试素材-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;
  const materialBody = [
    "这是一次用于软件工程报告的序知真实流程测试。",
    "素材内容故意保持为几条碎片：AI 知识库、原始素材、体系化重构、来源引用。",
    "预期结果是系统能把这条素材保存到个人素材库，后续可继续解析和体系化。",
  ].join("\\n");

  const workspaceReady = await waitForExpression(
    cdp,
    `Boolean(document.querySelector('input[placeholder="标题（可选）"]') && document.querySelector('textarea[placeholder="输入你的素材内容..."]'))`,
    35000,
  );
  note(`工作台输入区就绪: ${workspaceReady}`);
  if (workspaceReady) {
    await evaluate(
      cdp,
      `(() => {
        const setValue = (el, value) => {
          if (!el) return false;
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        return [
          setValue(document.querySelector('input[placeholder="标题（可选）"]'), ${jsString(materialTitle)}),
          setValue(document.querySelector('textarea[placeholder="输入你的素材内容..."]'), ${jsString(materialBody)}),
        ];
      })()`,
    );
    await capture(cdp, "real_04_workspace_filled_material.png", "工作台填写素材截图");
    await clickText(cdp, "新增素材");
    await delay(4500);
    note(`新增素材提交: ${materialTitle}`);
    await capture(cdp, "real_05_workspace_after_add.png", "新增素材后工作台截图");
  } else {
    note(`工作台停留在加载或错误状态，跳过新增素材。页面摘要: ${(await bodyText(cdp)).slice(0, 500).replace(/\\s+/g, " ")}`);
    await capture(cdp, "real_04_workspace_load_state.png", "工作台加载状态截图");
  }

  await goto(cdp, "/materials", "打开素材页");
  const materialsReady = await waitForExpression(
    cdp,
    `(() => {
      const text = document.body?.innerText || '';
      return !text.includes('加载中...') && (text.includes('新增素材') || text.includes('暂无素材') || text.includes(${jsString(materialTitle)}));
    })()`,
    45000,
  );
  note(`素材页业务内容就绪: ${materialsReady}`);
  await capture(cdp, "real_06_materials_page.png", "素材页截图");
  const textAfterAdd = await bodyText(cdp);
  note(`素材页是否出现测试素材: ${textAfterAdd.includes(materialTitle)}`);

  const selectedMaterialOnPage = await clickText(cdp, materialTitle);
  note(`素材页选中新建素材: ${selectedMaterialOnPage}`);
  if (selectedMaterialOnPage) {
    await waitForExpression(
      cdp,
      `(() => {
        const text = document.body?.innerText || '';
        return text.includes(${jsString(materialBody.split("\\n")[0])}) || text.includes('AI 解析') || text.includes('编辑');
      })()`,
      20000,
    );
    await capture(cdp, "real_07_material_detail.png", "素材详情与解析入口截图");
  }

  const clickedAnalyze = await evaluate(
    cdp,
    `(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /解析|重新解析|AI/.test(b.innerText || ''));
      if (!btn) return false;
      btn.click();
      return true;
    })()`,
  );
  note(`解析按钮点击: ${clickedAnalyze}`);
  await delay(4500);
  await capture(cdp, "real_08_materials_after_analyze_click.png", "点击解析后的素材页截图");

  await goto(cdp, "/knowledge", "打开知识体系页");
  const knowledgeReady = await waitForExpression(
    cdp,
    `(() => {
      const text = document.body?.innerText || '';
      return !text.includes('加载中...') && (text.includes('知识体系') || text.includes('暂无知识体系') || text.includes('一键体系化'));
    })()`,
    45000,
  );
  note(`知识体系页业务内容就绪: ${knowledgeReady}`);
  await capture(cdp, "real_09_knowledge_page.png", "知识体系页截图");

  const clickedKnowledgeNode = await clickExactText(cdp, "AI定义");
  note(`知识体系页选中 AI定义 节点: ${clickedKnowledgeNode}`);
  if (clickedKnowledgeNode) {
    await waitForExpression(
      cdp,
      `(() => {
        const text = document.body?.innerText || '';
        return text.includes('来源素材') || text.includes('相关节点') || text.includes('AI定义');
      })()`,
      20000,
    );
    await capture(cdp, "real_10_knowledge_node_detail.png", "知识节点详情截图");
  }

  const clickedGraphView = await clickText(cdp, "图谱");
  note(`知识体系页切换图谱视图: ${clickedGraphView}`);
  if (clickedGraphView) {
    await delay(1800);
    await capture(cdp, "real_11_knowledge_graph.png", "知识图谱视图截图");
  }

  await goto(cdp, "/qa", "打开问答页");
  await capture(cdp, "real_12_qa_empty.png", "问答页初始截图");
  const qaFilled = await evaluate(
    cdp,
    `(() => {
      const el = document.querySelector('textarea[placeholder="输入你的问题..."]');
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, '请根据我的知识库总结一下目前有哪些素材主题？');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  note(`问答输入框填写: ${qaFilled}`);
  if (qaFilled) {
    await evaluate(
      cdp,
      `(() => {
        const buttons = [...document.querySelectorAll('button')];
        const send = buttons.reverse().find((b) => !b.disabled);
        if (!send) return false;
        send.click();
        return true;
      })()`,
    );
    await delay(6500);
    await capture(cdp, "real_13_qa_after_question.png", "问答提交后截图");
  }

  await goto(cdp, "/settings", "打开设置页");
  await capture(cdp, "real_14_settings_page.png", "设置页截图");

  await writeFile(logPath, notes.join("\n"), "utf8");
  note(`测试日志已保存: ${logPath}`);
} catch (err) {
  note(`流程失败: ${err?.stack || err}`);
  if (cdp) await capture(cdp, "real_error.png", "错误现场截图").catch(() => null);
  await writeFile(logPath, notes.join("\n"), "utf8");
  process.exitCode = 1;
} finally {
  if (cdp) cdp.close();
  chrome.kill();
}
