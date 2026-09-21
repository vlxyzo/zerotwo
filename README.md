<!--
版权所有。允许个人和商业使用及修改。
重新分发请严格遵循 GPL-V3.0 协议，且请勿声称原创。

项目  :  Zero Two v0.0.1-alpha
作者  :  Velix
协议  :  GPL-V3.0
源码  :  github.com/vlxyzo/zerotwo
-->

<!-- header -->

<div align="center">
  <h1><b>Zero Two</b></h1>
  <img src="https://github.com/user-attachments/assets/7097db10-b9ec-400a-8341-214bf294f57c" alt="banner"><br><br>
  <sub>A hyper aesthetic Telegram assistant. Maintained by <a href="https://github.com/vlxyzo">Velix</a></sub>
</div>

---

<!-- badge -->

<div align="center">
<!--
<a href="https://github.com/vlxyzo/zerotwo/network/members"><img src="https://img.shields.io/github/forks/vlxyzo/zerotwo?label=forks&logo=git&logoColor=white&style=flat&labelColor=black&color=930000" alt="frk"/></a>
<a href="https://github.com/vlxyzo/zerotwo/watchers"><img src="https://img.shields.io/github/watchers/vlxyzo/zerotwo?label=watchers&logo=clarifai&logoColor=white&style=flat&labelColor=930000&color=black" alt="wtc"/></a>
<a href="https://github.com/vlxyzo/zerotwo/stargazers/"><img src="https://img.shields.io/github/stars/vlxyzo/zerotwo?label=stars&logo=apachespark&logoColor=white&style=flat&labelColor=930000&color=black" alt="str"/></a>
-->
  <a href="https://github.com/vlxyzo/zerotwo"><img src="https://img.shields.io/badge/v0.0.1--alpha-black?style=flat&logo=github&logoColor=white&labelColor=930000" alt="rls"/></a>
  <a href="https://github.com/search?q=repo:vlxyzo/zerotwo&language:TypeScript&type=code"><img src="https://img.shields.io/github/languages/top/vlxyzo/zerotwo?label&logo=typescript&logoColor=white&style=flat&labelColor=930000&color=black" alt="ts"/></a>
  <a href="https://github.com/vlxyzo/zerotwo/blob/main/LICENSE"><img src="https://img.shields.io/badge/GPL_v3.0-black?style=flat&logo=gnu&logoColor=white&labelColor=930000" alt="lcn"/></a>
</div>

---

<!-- caution n warn -->

> [!CAUTION]
> **ALPHA STAGE & OPEN SOURCE LICENSE (DISCLAIMER)**
>
> This project is currently in **Alpha Testing (`v0.0.1-alpha`)**. Expect bugs, unexpected crashes, and breaking changes.
>
> - **Commercial Use / Selling:** You are entirely free to modify, distribute, or sell this project. **HOWEVER**, under the GPL-3.0 rules, any modified or distributed versions _must_ remain open-source and be licensed under the exact same GPL-3.0 license.
> - **Zero Liability:** The [author](https://github.com/vlxyzo) and maintainers assume **no liability or responsibility** for any account bans, data loss, API downtime, or damages resulting from the use of this software. **USE AT YOUR OWN RISK.**

> [!WARNING]
> **EXTERNAL API RELIANCE & TELEGRAM RISKS**
>
> 1. **Third-Party Endpoints:** This project heavily relies on external web APIs for its core features. If the target API is down, rate-limited, or changes its response structure, the bot _will_ break or throw errors.
> 2. **Unhandled Alpha Bugs:** Because this is an early alpha release, error handling for external API timeouts or invalid JSON responses might not be fully polished yet. Expect the bot to crash if an endpoint acts up.
> 3. **FloodWait & Rate Limits:** Telegram has strict API rate limits. Spamming commands, sending excessive messages, or ignoring `retry-after` headers will trigger `FloodWait` errors or temporary server IP bans.
> 4. **Spam & User Reports:** Using this bot for unsolicited mass broadcasting will lead to user reports. Telegram's anti-spam system will permanently ban bots (and potentially associated accounts) if flagged for abuse.
> 5. **Userbot Risks (If applicable):** If you run this as a Userbot (logging in with a user phone number via MTProto instead of a BotFather token), the risk of a permanent account ban is significantly higher. Avoid automating high-frequency user actions.

---

<!--- flowchart -->

<div align="center">
  <h1><b>Flow Diagram</b></h1>
</div>

```mermaid
%%{init: {"flowchart": {"rankSpacing": 60, "nodeSpacing": 50, "curve": "stepAfter"}}}%%
flowchart LR
    classDef init fill:#1a1a1a,stroke:#e63946,color:#f5f0f0,stroke-width:1px;
    classDef core fill:#e63946,stroke:#ff9aa6,color:#1a0505,stroke-width:1px;
    classDef db fill:#7f1d1d,stroke:#ff6b81,color:#fdeaea,stroke-width:1px;
    classDef check fill:#2a0f10,stroke:#f3b13c,color:#f3b13c,stroke-width:1px;
    classDef action fill:#a11d2e,stroke:#ffc4cc,color:#fdeaea,stroke-width:1px;
    classDef terminal fill:#262023,stroke:#8c8083,color:#c9bdbf,stroke-width:1px;

    A([bootstrap]):::init --> B[load Core]:::core
    B --> C([global config]):::init
    B --> D([load all plugins]):::init
    B --> E[(database)]:::db
    E -.-|interval| S((sweeper)):::db
    E --> F([telegraf]):::core
    F ==> G([handler]):::core
    G --> H(prefix valid?):::check
    H -- no --> Z([ignore]):::terminal
    H -- yes --> I(plugin exist?):::check
    I -.-|check| D
    I -- no --> J[did you mean]:::action
    I -- yes --> K(access allowed?):::check
    K -.-|check| G
    K -- fail --> L([access denied]):::action
    K -- pass --> M(registered?):::check
    M -- required --> N(get user):::db
    N -.-|query| E
    N -- not found --> O([ask register]):::action
    N -- found --> P(execute):::action
    M -- no --> P
    P --> Q([reply message]):::core
```

---

<!-- key features -->

<div align="center">
  <h1><b>Key Features</b></h1>
</div>

<table align="center" width="100%">
  <tr>
    <td align="center" width="33%">
      <b>ELITE PERFORMANCE</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png" width="45" alt="speed"/><br><br>
      Strict TS 5+<br>Native ESModules
    </td>
    <td align="center" width="33%">
      <b>AI SUPPORT</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png" width="45" alt="ai"/><br><br>
      Smart Conversational<br>Automated Workflows
    </td>
    <td align="center" width="33%">
      <b>ROBUST STORAGE</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/File%20Folder.png" width="45" alt="data"/><br><br>
      Supabase Database<br>Persistent State
    </td>
    </tr><tr>
    <td align="center" width="33%">
      <b>MODULAR ARCH</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gear.png" width="45" alt="gear"/><br><br>
      Plug-and-Play Plugins<br>Clean and Maintainable
    </td>
    <td align="center" width="33%">
      <b>OMNI FETCH</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Inbox%20Tray.png" width="45" alt="download"/><br><br>
      HD Media Downloader<br>Fast Async Pipeline
    </td>
    <td align="center" width="33%">
      <b>OWNER TOOLS</b><br><br>
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" width="45" alt="dev"/><br><br>
      Eval and Shell Commands<br>Full Owner Control
    </td>
  </tr>
</table>

---

<!-- requirements -->

<div align="center">
  <h1><b>Requirements</b></h1>
</div>

<table align="center" width="100%">
  <thead>
    <tr>
      <th align="center" width="30%">Dependency</th>
      <th align="center" width="20%">Version</th>
      <th align="center" width="50%">Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><b>Node.js</b></td>
      <td align="center"><code>&gt;=24.0.0</code></td>
      <td align="center">Core runtime (uses native <code>--env-file</code>)</td>
    </tr><tr>
      <td align="center"><b>npm</b></td>
      <td align="center"><code>&gt;=11.0.0</code></td>
      <td align="center">Default package manager</td>
    </tr><tr>
      <td align="center"><b>TypeScript</b></td>
      <td align="center"><code>^7.0.2</code></td>
      <td align="center">Core programming language</td>
    </tr><tr>
      <td align="center"><b>tsx</b></td>
      <td align="center"><code>^4.23.13</code></td>
      <td align="center">TypeScript execution engine for Node.js</td>
    </tr><tr>
      <td align="center"><b>Git</b></td>
      <td align="center">Any</td>
      <td align="center">Version control and repository updates</td>
    </tr><tr>
      <td align="center"><b>FFmpeg</b></td>
      <td align="center">Any</td>
      <td align="center">Required for media processing</td>
    </tr><tr>
      <td align="center"><b>PM2</b></td>
      <td align="center">Any</td>
      <td align="center">Optional for 24/7 process management</td>
    </tr>
  </tbody>
</table>

---

<!-- filler -->

<img src="./source/media/image/thumb/4.png" alt="banner1">
<img src="./source/media/image/thumb/1.png" alt="banner2">
<img src="./source/media/image/thumb/2.png" alt="banner3">
<img src="./source/media/image/thumb/3.png" alt="banner1">

---

<!-- docs -->

<div align="center">
  <h1><b>Explore Docs</b></h1>
</div>

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <b><a href="./docs/custom_l.md">Customization</a></b>
      <br>Change prefixes, names, and core bot behaviors
    </td>
    <td width="50%" valign="top">
      <b><a href="./docs/install_l.md">Installation</a></b>
      <br>Deep-dive setup guide and error troubleshooting
    </td>
  </tr><tr>
    <td width="50%" valign="top">
      <b><a href="./docs/deploy_l.md">Deployment</a></b>
      <br>Advanced steps for VPS, Heroku, and Pterodactyl
    </td>
    <td width="50%" valign="top">
      <b><a href="./docs/path_l.md">Project Structure</a></b>
      <br>A full map of the codebase and directories
    </td
  </tr><tr>
    <td colspan="2" align="center">
      <b><a href="./docs/REPORT.md">Bug Report</a></b>
      <br>Found a glitch? Help me improve by reporting it here
    </td>
  </tr>
</table>
