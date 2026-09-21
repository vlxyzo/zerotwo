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
  <h1><b>ZEROTWO</b> <code>⟨002⟩</code></h1>
  <img src="https://github.com/user-attachments/assets/7097db10-b9ec-400a-8341-214bf294f57c" alt="banner"><br>
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
> **EXTERNAL API RELIANCE & TELEGRAM RISKS:**
>
> 1. **Third-Party Endpoints:** This project heavily relies on external web APIs for its core features. If the target API is down, rate-limited, or changes its response structure, the bot _will_ break or throw errors.
> 2. **Unhandled Alpha Bugs:** Because this is an early alpha release, error handling for external API timeouts or invalid JSON responses might not be fully polished yet. Expect the bot to crash if an endpoint acts up.
> 3. **FloodWait & Rate Limits:** Telegram has strict API rate limits. Spamming commands, sending excessive messages, or ignoring `retry-after` headers will trigger `FloodWait` errors or temporary server IP bans.
> 4. **Spam & User Reports:** Using this bot for unsolicited mass broadcasting will lead to user reports. Telegram's anti-spam system will permanently ban bots (and potentially associated accounts) if flagged for abuse.
> 5. **Userbot Risks (If applicable):** If you run this as a Userbot (logging in with a user phone number via MTProto instead of a BotFather token), the risk of a permanent account ban is significantly higher. Avoid automating high-frequency user actions.

---

<!-- requirement -->

<div align="center">
<h1><b>Requirements</b></h1>
</div>

| Dependency     | Version    | Details                                 |
| :------------- | :--------- | :-------------------------------------- |
| **Node.js**    | `>=24.0.0` | Core runtime (uses native `--env-file`) |
| **npm**        | `>=11.0.0` | Default package manager                 |
| **TypeScript** | `^7.0.2`   | Core programming language               |
| **tsx**        | `^4.23.13` | TypeScript execution engine for Node.js |
| **Git**        | Any        | Version control and repository updates  |
| **FFmpeg**     | Any        | Required for media processing           |
| **PM2**        | Any        | Optional for 24/7 process management    |
