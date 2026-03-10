# RustyRumblerTelegram

This is the Telegram Mini App clone of your working RustyRumbler shared-live build.

## What is different from the main build

- Telegram Mini App script added
- Calls `Telegram.WebApp.ready()` and `expand()`
- Keeps the same shared live arena behavior
- Intended to be launched from a Telegram bot menu button or main Mini App button

## Netlify settings

- Publish directory: leave blank
- Functions directory: `netlify/functions`

## Required environment variable

- `RUSTY_ADMIN_CODE`

## BotFather setup checklist

Use your Telegram bot and set:
- Menu button URL = your deployed Netlify URL
- Main Mini App URL = your deployed Netlify URL

## Current behavior

This build still uses one shared arena for everyone who opens it.
That is perfect for one main Telegram community room.

Later you can upgrade it to per-group arena state using Telegram chat context.
