# Rusty Rumble (shared live version)

This version keeps the hidden admin flow, Rusty image, narration, podium, and settings UI, but moves the game state to Netlify Blobs so everyone sees the same game.

## Required environment variable

- `RUSTY_ADMIN_CODE`

## Deploy settings

- Publish directory: leave blank
- Functions directory: `netlify/functions`

## Notes

- Type `rusty` anywhere on the page to open the admin passcode modal.
- Admin actions save to shared Netlify storage.
- The public page polls every 2 seconds for updates.
