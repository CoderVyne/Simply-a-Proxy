# Simply — Private Proxy Browser

Simply is a high-performance, minimalist web proxy designed for speed and stealth. Built on the Scramjet engine and Wisp protocol, it allows you to browse the web freely with a focus on a premium, distraction-free user experience.

## Features

* **Scramjet Proxy**: High-speed, robust web proxying that supports modern web standards.
* **Stealth Cloaking**: Toggle "About:Blank Cloaking" to hide your browsing in a masked tab with a discreet title.
* **Forced Dark Mode**: Automatically inverts light websites into a comfortable dark theme.
* **Custom Themes**: Switch between Midnight, Slate, and Deep Sea aesthetics.
* **Speed Dial**: Quick-access tiles for your most-used sites on the home dashboard.
* **Status Badge**: Real-time clock and battery level monitoring built into the UI.
* **Responsive Design**: Optimized for both desktop and mobile browsing.

## Tech Stack

* **Backend**: Node.js, Fastify
* **Proxy Engine**: Scramjet, Bare-Mux
* **Networking**: Wisp Protocol, Libcurl Transport
* **Frontend**: Vanilla JS, CSS3 (Glassmorphism), Tabler Icons

## Deployment

The easiest way to host Simply is on **Render**:

1. Fork this repository.
2. Create a new **Web Service** on Render.
3. Connect your fork.
4. Use the following settings:

   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
5. Click Deploy!

## Credits

* Built with [Scramjet](https://github.com/MercuryWorkshop/scramjet)
* Icons by [Tabler Icons](https://tabler-icons.io/)

---

*Simply. Browsing, evolved.*
